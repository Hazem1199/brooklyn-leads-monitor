<template>
  <NuxtLayout name="default">
    <div class="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <!-- Title Section -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-white tracking-tight">SaaS Dashboard Overview</h2>
          <p class="text-slate-400 text-sm mt-1">Real-time niche leads monitor and AI classifier</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div :class="['w-2 h-2 rounded-full', isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500']" />
            <span class="text-[11px] font-bold tracking-wider" :class="isConnected ? 'text-emerald-400' : 'text-slate-400'">
              {{ isConnected ? 'REAL-TIME ACTIVE' : 'DISCONNECTED' }}
            </span>
          </div>
          <button
            @click="openSimulator"
            class="btn-primary flex items-center gap-2"
          >
            <span>🔬</span> Test Simulation
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="glass rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/30 transition-all duration-300 relative group"
        >
          <div class="absolute inset-0 bg-indigo-500/2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div class="text-3xl mb-2">{{ stat.icon }}</div>
          <div class="text-3xl font-extrabold text-white tracking-tight">{{ stat.value }}</div>
          <div class="text-xs text-slate-400 font-medium mt-1">{{ stat.label }}</div>
        </div>
      </div>

      <!-- Two Column Layout: Monitors Overview & Recent Leads -->
      <div class="grid lg:grid-cols-3 gap-8">
        <!-- Left: Monitors Overview (Col span 1) -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-white tracking-tight">Monitored Niche Groups</h3>
            <NuxtLink to="/monitors" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              Manage Monitors ➔
            </NuxtLink>
          </div>

          <div v-if="monitorsLoading" class="glass rounded-2xl p-8 border border-slate-800 flex justify-center">
            <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>

          <div v-else-if="monitors.length === 0" class="glass rounded-2xl p-6 border border-slate-800 text-center space-y-3">
            <div class="text-4xl">🎯</div>
            <p class="text-slate-400 text-xs font-medium">You aren't monitoring any groups yet.</p>
            <NuxtLink to="/monitors" class="btn-primary w-full justify-center py-2 text-xs">
              + Add First Monitor
            </NuxtLink>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="monitor in monitors.slice(0, 3)"
              :key="monitor.id"
              class="glass rounded-2xl p-4 border border-slate-800/80 hover:border-slate-700/60 transition-all"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-white truncate max-w-[150px]">{{ monitor.group_name }}</span>
                <span :class="['text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider', monitor.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400']">
                  {{ monitor.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <p class="text-[11px] text-slate-400 line-clamp-1 mb-2">🎯 {{ monitor.niche_description || 'No custom description' }}</p>
              <div class="flex flex-wrap gap-1">
                <span v-for="key in monitor.keywords?.split(',').slice(0, 3)" :key="key" class="text-[9px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-indigo-400">
                  {{ key.trim() }}
                </span>
              </div>
            </div>
            <div v-if="monitors.length > 3" class="text-center">
              <NuxtLink to="/monitors" class="text-[11px] text-slate-400 hover:text-slate-300 font-semibold">
                + View all {{ monitors.length }} monitors
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Right: Recent Leads (Col span 2) -->
        <div class="lg:col-span-2 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-white tracking-tight">Recent Detected Leads</h3>
            <NuxtLink to="/leads" class="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              All Leads ➔
            </NuxtLink>
          </div>

          <div v-if="isLoading && leads.length === 0" class="glass rounded-2xl p-12 border border-slate-800 flex flex-col items-center justify-center gap-3">
            <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span class="text-xs text-slate-400">Loading leads...</span>
          </div>

          <div v-else-if="leads.length === 0" class="glass rounded-2xl p-12 border border-slate-800 text-center space-y-3">
            <div class="text-4xl">📥</div>
            <p class="text-slate-400 text-xs font-medium">No leads detected yet. Try running a simulation!</p>
          </div>

          <div v-else class="space-y-4">
            <article
              v-for="lead in leads.slice(0, 5)"
              :key="lead.id"
              class="glass rounded-2xl p-5 border transition-all duration-200 hover:border-slate-700/60"
              :class="lead.is_lead ? 'border-emerald-500/10 hover:border-emerald-500/30' : 'border-slate-800'"
              :dir="isArabic(lead.post_content) ? 'rtl' : 'ltr'"
            >
              <div class="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <span :class="lead.is_lead ? 'badge-lead' : 'badge-not-lead'">
                    {{ lead.is_lead ? '✓ Lead' : '✗ Not Lead' }}
                  </span>
                  <span class="text-[11px] text-slate-400 font-bold">
                    👥 {{ lead.group_name }}
                  </span>
                  <span class="text-[10px] text-slate-500 font-medium">
                    {{ formatDate(lead.created_at) }}
                  </span>
                </div>
                <div class="text-xs font-bold text-white bg-slate-900 border border-slate-800 px-2 py-1 rounded-xl">
                  {{ Math.round(lead.confidence_score * 100) }}% Confidence
                </div>
              </div>

              <!-- Post text -->
              <p class="text-sm text-slate-200 font-medium line-clamp-2 leading-relaxed mb-2">{{ lead.post_content }}</p>
              
              <!-- AI Summary -->
              <p class="text-xs text-slate-400 italic">💡 {{ lead.summary }}</p>
            </article>
          </div>
        </div>
      </div>
    </div>

    <!-- Simulator Modal -->
    <Transition name="modal">
      <div
        v-if="showSimulator"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        @click.self="showSimulator = false"
      >
        <div class="glass rounded-3xl p-6 w-full max-w-lg border border-indigo-500/30 shadow-2xl relative">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-lg font-bold text-white">🔬 Simulate Lead Scraper</h3>
              <p class="text-xs text-slate-400 mt-0.5">Test dynamic multi-tenant niche classification</p>
            </div>
            <button
              class="w-8 h-8 rounded-full glass border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              @click="showSimulator = false"
            >
              ✕
            </button>
          </div>

          <div v-if="monitors.length === 0" class="p-6 text-center space-y-4">
            <div class="text-4xl">⚠️</div>
            <p class="text-slate-300 text-sm">You must add at least one active monitor first to simulate.</p>
            <button @click="goToMonitors" class="btn-primary">Add Group Monitor</button>
          </div>

          <div v-else class="space-y-4">
            <!-- Select Group Monitor -->
            <div>
              <label class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">
                Select Monitor (Niche Context)
              </label>
              <select
                v-model="selectedMonitorId"
                class="input-field"
              >
                <option v-for="m in monitors" :key="m.id" :value="m.id">
                  {{ m.group_name }} ({{ m.keywords?.split(',')[0] || 'niche' }})
                </option>
              </select>
            </div>

            <!-- Post Text -->
            <div>
              <label class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">
                Facebook Post Content
              </label>
              <textarea
                v-model="simulatorText"
                class="input-field min-h-[100px]"
                placeholder="Type Facebook post text here in Arabic, English, or slang..."
                dir="auto"
              />
            </div>

            <!-- Action buttons -->
            <div class="flex gap-3 pt-2">
              <button
                class="btn-primary flex-1 justify-center py-3"
                :disabled="!simulatorText.trim() || isSimulating"
                @click="runSimulation"
              >
                <span v-if="isSimulating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {{ isSimulating ? 'Analyzing...' : 'Simulate Webhook POST' }}
              </button>
              <button class="btn-ghost" @click="showSimulator = false">Cancel</button>
            </div>

            <!-- Simulation Result Alert -->
            <div v-if="simulationResult" class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2 mt-4 text-xs">
              <div class="flex justify-between items-center">
                <span class="font-bold text-white text-sm">Result Summary</span>
                <span :class="simulationResult.is_lead ? 'badge-lead' : 'badge-not-lead'">
                  {{ simulationResult.is_lead ? 'Lead Detected' : 'Not a Lead' }}
                </span>
              </div>
              <p class="text-slate-300 font-medium">💡 {{ simulationResult.summary }}</p>
              <p class="text-[10px] text-slate-400">Confidence: {{ Math.round(simulationResult.confidence_score * 100) }}% | Intent: {{ simulationResult.intent_category }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLeads } from '~/composables/useLeads'
import { useAuth } from '~/composables/useAuth'
import { useRouter, useHead } from '#imports'

definePageMeta({
  middleware: 'auth',
  ssr: false
})

useHead({
  title: 'Dashboard Overview — Lead Monitor'
})

const { leads, total, isLoading, isConnected, refresh } = useLeads()
const { authFetch } = useAuth()
const router = useRouter()

// Monitors State
const monitors = ref<any[]>([])
const monitorsLoading = ref(false)

// Simulator State
const showSimulator = ref(false)
const selectedMonitorId = ref('')
const simulatorText = ref('')
const isSimulating = ref(false)
const simulationResult = ref<any | null>(null)

// Stats Calculation
const stats = computed(() => {
  const leadsList = leads.value
  const detected = leadsList.filter(l => l.is_lead).length
  const avgConf = detected > 0
    ? Math.round(leadsList.filter(l => l.is_lead).reduce((s, l) => s + l.confidence_score, 0) / detected * 100)
    : 0

  return [
    { icon: '🎯', label: 'Active Monitors', value: monitors.value.length },
    { icon: '📊', label: 'Total Scanned', value: total.value },
    { icon: '🔥', label: 'Leads Detected', value: detected },
    { icon: '📈', label: 'Avg Confidence', value: `${avgConf}%` },
  ]
})

onMounted(async () => {
  await fetchMonitors()
})

async function fetchMonitors() {
  monitorsLoading.value = true
  try {
    const res = await authFetch<{ success: boolean; data: any[] }>('/api/monitors')
    monitors.value = res.data || []
    if (monitors.value.length > 0) {
      selectedMonitorId.value = monitors.value[0].id
    }
  } catch (err) {
    console.error('Failed to fetch monitors:', err)
  } finally {
    monitorsLoading.value = false
  }
}

function openSimulator() {
  simulationResult.value = null
  showSimulator.value = true
}

function goToMonitors() {
  showSimulator.value = false
  router.push('/monitors')
}

async function runSimulation() {
  if (!simulatorText.value.trim() || !selectedMonitorId.value) return
  isSimulating.value = true
  simulationResult.value = null

  const monitor = monitors.value.find(m => m.id === selectedMonitorId.value)

  try {
    const res = await authFetch<any>('/api/test-lead', {
      method: 'POST',
      body: {
        content: simulatorText.value.trim(),
        group_name: monitor?.group_name || 'Simulator',
        post_url: monitor?.group_url || 'https://facebook.com/groups/test-simulated/posts/1',
      }
    })
    
    simulationResult.value = res
    await refresh()
  } catch (err) {
    console.error('Simulation run failed:', err)
    alert('Simulation run failed.')
  } finally {
    isSimulating.value = false
  }
}

// Helpers
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-EG', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Africa/Cairo',
  })
}

function isArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text)
}
</script>

<style scoped>
.glass {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(16px);
}
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>
