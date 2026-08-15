import { ref } from 'vue'
import { createClient, type User, type Session } from '@supabase/supabase-js'
import { useRuntimeConfig, navigateTo } from '#imports'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const isInitialized = ref(false)

export function useAuth() {
  const config = useRuntimeConfig()
  
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseKey as string
  )

  async function initAuth() {
    if (isInitialized.value) return
    
    // Get initial session
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user ?? null
    
    // Setup listener
    supabase.auth.onAuthStateChange((event, currentSession) => {
      session.value = currentSession
      user.value = currentSession?.user ?? null
      
      // Save token in localStorage for easy access
      if (currentSession?.access_token) {
        localStorage.setItem('sb-access-token', currentSession.access_token)
      } else {
        localStorage.removeItem('sb-access-token')
      }

      if (event === 'SIGNED_OUT') {
        navigateTo('/login')
      }
    })
    
    isInitialized.value = true
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    session.value = data.session
    user.value = data.session?.user ?? null
    if (data.session?.access_token) {
      localStorage.setItem('sb-access-token', data.session.access_token)
    }
    return data
  }

  async function register(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    session.value = data.session
    user.value = data.session?.user ?? null
    if (data.session?.access_token) {
      localStorage.setItem('sb-access-token', data.session.access_token)
    }
    return data
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    session.value = null
    user.value = null
    localStorage.removeItem('sb-access-token')
  }

  // Helper to fetch with auth token
  function authFetch<T>(url: string, options: any = {}) {
    const token = localStorage.getItem('sb-access-token')
    return $fetch<T>(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : '',
      },
    })
  }

  return {
    user,
    session,
    initAuth,
    login,
    register,
    logout,
    authFetch,
    supabaseClient: supabase
  }
}
