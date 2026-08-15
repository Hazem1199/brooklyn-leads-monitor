<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
    <!-- Glowing background accents -->
    <div class="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] -top-40 -left-40 animate-pulse pointer-events-none" />
    <div class="absolute w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] -bottom-40 -right-40 animate-pulse pointer-events-none" style="animation-delay: 2s;" />

    <div class="w-full max-w-md glass border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10">
      <!-- BBS Branding -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-3xl mb-4 shadow-inner">
          🏫
        </div>
        <h1 class="text-2xl font-black text-white tracking-tight">Brooklyn Business School</h1>
        <p class="text-sm text-slate-400 mt-1.5 font-medium">Lead Monitor SaaS Platform</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <!-- Error Alert -->
        <div v-if="errorMsg" class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-start gap-2.5">
          <span>⚠️</span>
          <span class="flex-1">{{ errorMsg }}</span>
        </div>

        <!-- Email Field -->
        <div>
          <label class="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Email Address</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">📧</span>
            <input
              v-model="email"
              type="email"
              required
              class="input-field pl-12"
              placeholder="name@company.com"
            />
          </div>
        </div>

        <!-- Password Field -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-xs text-slate-400 font-bold uppercase tracking-wider block">Password</label>
          </div>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔒</span>
            <input
              v-model="password"
              type="password"
              required
              class="input-field pl-12"
              placeholder="••••••••"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="btn-primary w-full justify-center py-3.5 mt-2 text-sm font-bold shadow-lg shadow-indigo-600/20"
        >
          <span v-if="isLoading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          {{ isLoading ? 'Signing In...' : 'Sign In' }}
        </button>
      </form>

      <!-- Footer navigation -->
      <div class="text-center mt-6 pt-6 border-t border-slate-900">
        <p class="text-xs text-slate-500">
          Don't have an account?
          <NuxtLink to="/register" class="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            Register Here
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useRouter, useHead } from '#imports'

definePageMeta({
  middleware: 'auth'
})

useHead({
  title: 'Sign In — Lead Monitor'
})

const { login } = useAuth()
const router = useRouter()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMsg = ref<string | null>(null)

async function handleLogin() {
  isLoading.value = true
  errorMsg.value = null
  try {
    await login(email.value, password.value)
    router.push('/')
  } catch (err: any) {
    errorMsg.value = err.message || 'Invalid login credentials'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.glass {
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(16px);
}
</style>
