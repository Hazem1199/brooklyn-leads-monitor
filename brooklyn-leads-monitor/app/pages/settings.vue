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
          <!-- Status Alerts -->
          <div v-if="successMsg" class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <span>✅</span> {{ successMsg }}
          </div>
          <div v-if="errorMsg" class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span> {{ errorMsg }}
          </div>

          <!-- Connection Status Badge -->
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
              <span class="text-xs text-slate-500 font-bold uppercase tracking-wider block">Active Chat ID</span>
              <code class="text-xs text-indigo-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg block mt-1">
                {{ telegramChatId }}
              </code>
            </div>
          </div>

          <!-- Section 1: 1-Click Connection -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Method 1: Automatic 1-Click Link</h3>
            <div class="text-center py-2">
              <a
                :href="`https://t.me/brooklyn_mba_alert_bot?start=${user?.id}`"
                target="_blank"
                class="btn-primary inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-sm font-black shadow-lg shadow-indigo-600/30 hover:scale-[1.01] transition-transform w-full"
              >
                📲 Connect Telegram Automatically
              </a>
              <p class="text-[10px] text-slate-500 font-medium mt-2 leading-normal">
                Opens Telegram and launches the bot with a secure start token to link automatically.
              </p>
            </div>
          </div>

          <!-- Divider -->
          <div class="relative flex py-2 items-center">
            <div class="flex-grow border-t border-slate-800/80"></div>
            <span class="flex-shrink mx-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">OR</span>
            <div class="flex-grow border-t border-slate-800/80"></div>
          </div>

          <!-- Section 2: Manual Input & Fallback -->
          <form @submit.prevent="saveManualSettings" class="space-y-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Method 2: Manual Chat ID Configuration</h3>
            <div class="space-y-2">
              <label class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Telegram Chat ID
              </label>
              <input
                v-model="manualChatId"
                type="text"
                class="input-field"
                placeholder="e.g. 7909402843"
              />
              <span class="text-[9px] text-slate-550 block leading-normal">
                If the automatic link doesn't work, send <code>/start</code> to <a href="https://t.me/brooklyn_mba_alert_bot" target="_blank" class="text-indigo-400 font-bold hover:underline">@brooklyn_mba_alert_bot</a>, retrieve your ID from any info bot (like <code>@userinfobot</code>), and paste it above.
              </span>
            </div>

            <!-- Manual Actions -->
            <div class="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                :disabled="isSaving"
                class="btn-primary justify-center py-3 flex-1 text-xs font-bold"
              >
                <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                💾 Save Manual Settings
              </button>
              <button
                type="button"
                @click="testNotification"
                :disabled="isTesting || !telegramChatId"
                class="btn-ghost justify-center py-3 flex-1 text-xs font-bold hover:border-indigo-500 hover:text-white"
              >
                <span v-if="isTesting" class="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                ⚡ Send Test Alert
              </button>
              <button
                v-if="telegramChatId"
                type="button"
                @click="disconnectTelegram"
                :disabled="isSaving"
                class="btn-ghost justify-center py-3 flex-1 text-xs font-bold hover:border-rose-500/30 hover:text-rose-400"
              >
                🔴 Unlink Account
              </button>
            </div>
          </form>

          <!-- Polling Notification -->
          <div v-if="!telegramChatId" class="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center gap-3 text-xs text-slate-400">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Listening for automatic connection...
          </div>
        </div>
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
const manualChatId = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const isTesting = ref(false)
const successMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

let pollInterval: any = null

onMounted(async () => {
  await fetchProfile()
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
      manualChatId.value = telegramChatId.value
      if (telegramChatId.value) {
        stopPolling()
      } else {
        startPolling()
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
  }, 3000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

async function saveManualSettings() {
  isSaving.value = true
  successMsg.value = null
  errorMsg.value = null
  try {
    const res = await authFetch<{ success: boolean; data: any }>('/api/profile', {
      method: 'POST',
      body: { telegram_chat_id: manualChatId.value.trim() }
    })
    if (res.success) {
      telegramChatId.value = res.data.telegram_chat_id || ''
      manualChatId.value = telegramChatId.value
      successMsg.value = 'Settings saved successfully!'
      if (telegramChatId.value) {
        stopPolling()
      } else {
        startPolling()
      }
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to save settings'
  } finally {
    isSaving.value = false
  }
}

async function disconnectTelegram() {
  if (!confirm('Are you sure you want to unlink your Telegram account? You will stop receiving alert notifications.')) return
  isSaving.value = true
  successMsg.value = null
  errorMsg.value = null
  try {
    const res = await authFetch<{ success: boolean; data: any }>('/api/profile', {
      method: 'POST',
      body: { telegram_chat_id: '' }
    })
    if (res.success) {
      telegramChatId.value = ''
      manualChatId.value = ''
      successMsg.value = 'Telegram unlinked successfully!'
      startPolling()
    }
  } catch (err) {
    console.error('Failed to disconnect telegram:', err)
    errorMsg.value = 'Failed to unlink account'
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
