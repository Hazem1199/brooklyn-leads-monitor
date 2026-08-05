// composables/useLeads.ts
// Real-time leads composable using Supabase Realtime

import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { useRuntimeConfig } from '#app'
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'

export interface Lead {
  id: string
  group_name: string
  post_url: string | null
  post_content: string
  summary: string
  is_lead: boolean
  confidence_score: number
  sender: string | null
  created_at: string
}

export interface LeadsResponse {
  data: Lead[]
  total: number
  page: number
  pages: number
}

export function useLeads() {
  const config = useRuntimeConfig()
  const leads = ref<Lead[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isConnected = ref(false)
  const leadsOnlyFilter = ref(false)

  let supabase: SupabaseClient | null = null
  let channel: RealtimeChannel | null = null

  function getClient(): SupabaseClient {
    if (!supabase) {
      supabase = createClient(
        config.public.supabaseUrl as string,
        config.public.supabaseKey as string,
      )
    }
    return supabase
  }

  async function fetchLeads(page = 1) {
    isLoading.value = true
    error.value = null
    try {
      const res = await $fetch<LeadsResponse>('/api/leads', {
        params: { page, limit: 30, leads_only: leadsOnlyFilter.value },
      })
      leads.value = res.data
      total.value = res.total
    }
    catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load leads'
    }
    finally {
      isLoading.value = false
    }
  }

  function subscribeRealtime() {
    try {
      const client = getClient()
      channel = client
        .channel('leads-realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'leads' },
          (payload) => {
            const newLead = payload.new as Lead
            leads.value.unshift(newLead)
            total.value++
          },
        )
        .subscribe((status) => {
          isConnected.value = status === 'SUBSCRIBED'
        })
    }
    catch (err) {
      console.warn('[useLeads] Realtime subscription failed:', err)
    }
  }

  function unsubscribe() {
    if (channel && supabase) {
      supabase.removeChannel(channel)
      isConnected.value = false
    }
  }

  // Only run on client-side
  onMounted(async () => {
    await fetchLeads()
    subscribeRealtime()
  })

  onUnmounted(() => {
    unsubscribe()
  })

  return {
    leads: readonly(leads),
    total: readonly(total),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isConnected: readonly(isConnected),
    leadsOnlyFilter,
    fetchLeads,
    refresh: () => fetchLeads(1),
  }
}
