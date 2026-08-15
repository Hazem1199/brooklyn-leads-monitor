import { useAuth } from '../composables/useAuth'
import { defineNuxtRouteMiddleware, navigateTo } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  // Only execute on client-side
  if (import.meta.server) return

  const { user, initAuth } = useAuth()
  await initAuth()

  const publicRoutes = ['/login', '/register']
  const isPublic = publicRoutes.includes(to.path)

  if (!user.value && !isPublic) {
    return navigateTo('/login')
  }

  if (user.value && isPublic) {
    return navigateTo('/')
  }
})
