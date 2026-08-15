<template>
  <NuxtLayout name="default">
    <div class="p-6 md:p-8 space-y-8 max-w-2xl mx-auto w-full font-sans">
      <!-- Title Section -->
      <div>
        <h2 class="text-2xl font-black text-white tracking-tight">Personal Settings</h2>
        <p class="text-slate-400 text-sm mt-1">Configure your Telegram Alert notifications and profile integrations</p>
      </div>

      <!-- Settings Card -->
      <div class="glass rounded-3xl p-6 md:p-8 border border-slate-800 space-y-6 relative overflow-hidden">
        <!-- Glowing card gradient -->
        <div class="absolute w-[200px] h-[200px] rounded-full bg-indigo-500/5 blur-[50px] -top-20 -right-20 pointer-events-none" />

        <div class="space-y-6">
          <!-- Connection Status -->
          <div class="flex items-center justify-between p-5 rounded-2xl bg-slate-900/60 border border-slate-850">
            <div>
              <span class="text-xs text-slate-500 font-bold uppercase tracking-wider block">Connection Status</span>
              <div class="flex items-center gap-2 mt-1">
                <span :class="['w-2 h-2 rounded-full', telegramChatId ? 'bg-emerald-400' : 'bg-amber-400']" />
                <span class="text-sm font-bold text-white">
                  {{ telegramChatId ? 'Connected ✅' : 'Not Connected ⚠️' }}
                </span>
              </div>
            </div>
            <div v-if="telegramChatId" class="text-right">
              <span class="text-xs text-slate-500 font-bold uppercase tracking-wider block">Chat ID</span>
              <code class="text-xs text-indigo-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg block mt-1">
                {{ telegramChatId }}
              </code>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-4">
            <!-- Connect Button -->
            <div v-if="!telegramChatId" class="text-center py-4">
              <a
                :href="`https://t.me/brooklyn_mba_alert_bot?start=${user?.id}`"
                target="_blank"
                class="btn-primary inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-sm font-black shadow-lg shadow-indigo-600/30 hover:scale-[1.02] transition-transform w-full"
              >
                📲 Connect Telegram Automatically
              </a>
              <p class="text-[10px] text-slate-500 font-medium mt-3 leading-normal">
                Clicking this will open Telegram and start our Bot to link your account in 1-click.
              </p>
            </div>

            <!-- Disconnect / Test buttons -->
            <div v-else class="flex flex-col sm:flex-row gap-3">
              <button
                @click="testNotification"
                :disabled="isTesting"
                class="btn-primary justify-center py-3.5 flex-1 text-xs font-bold"
              >
                <span v-if="isTesting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ⚡ Send Test Alert
              </button>
              <button
                @click="disconnectTelegram"
                :disabled="isSaving"
                class="btn-ghost justify-center py-3.5 flex-1 text-xs font-bold hover:border-rose-500/30 hover:text-rose-400"
              >
                <span v-if="isSaving" class="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                🔴 Unlink Account
              </button>
            </div>
          </div>

          <!-- Live Status feedback -->
          <div v-if="!telegramChatId" class="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center gap-3 text-xs text-slate-400">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Waiting for Telegram connection...
          </div>
        </div>
      </div>

      <!-- Quick Step-by-Step Instructions -->
      <div v-if="!telegramChatId" class="glass rounded-3xl p-6 border border-slate-800/80 space-y-4 animate-fade-in-up">
        <h3 class="text-sm font-bold text-white uppercase tracking-wider">How it works:</h3>
        <ol class="text-xs text-slate-400 space-y-2.5 list-decimal pl-4 leading-relaxed font-medium">
          <li>Click the <b>"Connect Telegram Automatically"</b> button above.</li>
          <li>A new browser tab will open directing you to <b>@brooklyn_leads_bot</b>.</li>
          <li>Click <b>Start</b> (or send the generated code) inside Telegram.</li>
          <li>Our bot will automatically read your account token, link it, and show the "Connected" status here in real-time!</li>
        </ol>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useHead } from '#imports'

definePageMeta({
  middleware: 'auth',
  ssr: false
})

useHead({
  title: 'Settings — Lead Monitor'
})

const { authFetch, user } = useAuth()

const telegramChatId = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const isTesting = ref(false)

let pollInterval: any = null

onMounted(async () => {
  await fetchProfile()
  // Start polling connection status if not connected
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

async function fetchProfile() {
  try {
    const res = await authFetch<{ success: boolean; data: any }>('/api/profile')
    if (res.success && res.data) {
      telegramChatId.value = res.data.telegram_chat_id || ''
      if (telegramChatId.value) {
        stopPolling()
      }
    }
  } catch (err) {
    console.error('Failed to load profile:', err)
  }
}

function startPolling() {
  if (pollInterval) return
  pollInterval = setInterval(async () => {
    if (!telegramChatId.value) {
      await fetchProfile()
    }
  }, 3000) // Poll every 3 seconds
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

async function disconnectTelegram() {
  if (!confirm('Are you sure you want to unlink your Telegram account? You will stop receiving alert notifications.')) return
  isSaving.value = true
  try {
    const res = await authFetch<{ success: boolean; data: any }>('/api/profile', {
      method: 'POST',
      body: { telegram_chat_id: '' }
    })
    if (res.success) {
      telegramChatId.value = ''
      startPolling()
    }
  } catch (err) {
    console.error('Failed to disconnect telegram:', err)
    alert('Failed to unlink account.')
  } finally {
    isSaving.value = false
  }
}

async function testNotification() {
  isTesting.value = true
  try {
    const res = await authFetch<{ success: boolean; message: string }>('/api/test-telegram', {
      method: 'POST',
      body: { telegram_chat_id: telegramChatId.value }
    })
    if (res.success) {
      alert('Test alert sent! Check Telegram.')
    }
  } catch (err: any) {
    alert(err.message || 'Failed to send test alert')
  } finally {
    isTesting.value = false
  }
}
</script>

<style scoped>
.glass {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(16px);
}
</style>
