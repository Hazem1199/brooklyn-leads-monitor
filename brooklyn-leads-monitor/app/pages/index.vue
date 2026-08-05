<template>
  <div class="min-h-screen">
    <!-- Google Fonts -->
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Cairo:wght@400;600;700&display=swap"
      rel="stylesheet"
    />

    <!-- Header -->
    <header class="glass sticky top-0 z-50 border-b border-indigo-500/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-500/30">
            🏫
          </div>
          <div>
            <h1 class="text-lg font-bold text-white leading-tight">Brooklyn Business School</h1>
            <p class="text-xs text-indigo-400 font-medium">MBA Lead Monitor — Real-time Intelligence</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Live indicator -->
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-indigo-500/20">
            <div :class="['w-2 h-2 rounded-full', isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500']" />
            <span class="text-xs font-medium" :class="isConnected ? 'text-emerald-400' : 'text-slate-400'">
              {{ isConnected ? 'LIVE' : 'Offline' }}
            </span>
          </div>

          <button
            id="btn-simulate"
            class="btn-primary"
            @click="showSimulator = true"
          >
            <span>🔬</span> Simulate Post
          </button>
        </div>
      </div>
    </header>

    <!-- Stats Bar -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="glass rounded-2xl p-4 border border-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300"
        >
          <div class="text-2xl mb-1">{{ stat.icon }}</div>
          <div class="text-2xl font-bold text-white">{{ stat.value }}</div>
          <div class="text-xs text-slate-400 mt-0.5">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
      <!-- Toolbar -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-white">Detected Leads</h2>
          <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">
            {{ total }} total
          </span>
        </div>

        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
            <input
              id="toggle-leads-only"
              v-model="leadsOnlyFilter"
              type="checkbox"
              class="w-4 h-4 rounded accent-indigo-500"
              @change="refresh"
            />
            Leads only
          </label>
          <button
            id="btn-refresh"
            class="btn-ghost text-xs"
            :disabled="isLoading"
            @click="refresh"
          >
            <span :class="['text-sm', isLoading && 'animate-spin inline-block']">↻</span>
            Refresh
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading && leads.length === 0" class="flex flex-col items-center justify-center py-24 gap-4">
        <div class="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p class="text-slate-400 text-sm">Loading leads...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="glass rounded-2xl p-6 border border-red-500/20 text-center">
        <div class="text-3xl mb-2">⚠️</div>
        <p class="text-red-400 font-medium">{{ error }}</p>
        <button class="btn-ghost mt-3 text-sm" @click="refresh">Retry</button>
      </div>

      <!-- Empty State -->
      <div v-else-if="leads.length === 0" class="flex flex-col items-center justify-center py-24 gap-4">
        <div class="text-5xl">📭</div>
        <p class="text-slate-400 text-sm">No leads yet. Simulate a post to get started!</p>
        <button class="btn-primary" @click="showSimulator = true">
          🔬 Simulate a Post
        </button>
      </div>

      <!-- Leads Grid -->
      <div v-else class="grid gap-4">
        <TransitionGroup name="lead-list">
          <article
            v-for="(lead, i) in leads"
            :key="lead.id"
            class="glass rounded-2xl p-5 border transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 animate-fade-in-up"
            :class="lead.is_lead ? 'border-emerald-500/20' : 'border-slate-700/30'"
            :style="{ animationDelay: `${i * 30}ms` }"
          >
            <div class="flex items-start justify-between gap-4">
              <!-- Left: content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <span :class="lead.is_lead ? 'badge-lead' : 'badge-not-lead'">
                    {{ lead.is_lead ? '✓ Lead' : '✗ Not a Lead' }}
                  </span>
                  <span class="text-xs text-slate-400 font-medium">
                    👥 {{ lead.group_name }}
                  </span>
                  <span class="text-xs text-slate-500">
                    {{ formatDate(lead.created_at) }}
                  </span>
                </div>

                <!-- Post Content -->
                <p
                  class="text-sm text-slate-200 leading-relaxed mb-2 font-medium"
                  :dir="isArabic(lead.post_content) ? 'rtl' : 'ltr'"
                >
                  {{ lead.post_content }}
                </p>

                <!-- Summary -->
                <p class="text-xs text-slate-400 italic mb-3">
                  💡 {{ lead.summary }}
                </p>

                <!-- Footer -->
                <div class="flex items-center gap-3">
                  <a
                    v-if="lead.post_url"
                    :href="lead.post_url"
                    target="_blank"
                    class="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    🔗 View Original Post
                  </a>
                  <span v-if="lead.sender" class="text-xs text-slate-500">
                    📧 {{ lead.sender }}
                  </span>
                </div>
              </div>

              <!-- Right: confidence -->
              <div class="flex-shrink-0 text-center">
                <div
                  class="w-16 h-16 rounded-2xl flex flex-col items-center justify-center"
                  :class="confidenceClass(lead.confidence_score)"
                >
                  <span class="text-xl font-bold">{{ Math.round(lead.confidence_score * 100) }}</span>
                  <span class="text-xs opacity-70">%</span>
                </div>
                <p class="text-xs text-slate-500 mt-1">confidence</p>
              </div>
            </div>
          </article>
        </TransitionGroup>
      </div>
    </main>

    <!-- Simulator Modal -->
    <Transition name="modal">
      <div
        v-if="showSimulator"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);"
        @click.self="showSimulator = false"
      >
        <div class="glass rounded-3xl p-6 w-full max-w-lg border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-lg font-bold text-white">🔬 Simulate Facebook Post</h3>
              <p class="text-xs text-slate-400 mt-0.5">Test the full AI analysis pipeline</p>
            </div>
            <button
              id="btn-close-modal"
              class="w-8 h-8 rounded-full glass flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              @click="showSimulator = false"
            >
              ✕
            </button>
          </div>

          <!-- Quick samples -->
          <div class="mb-4">
            <p class="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Quick Samples</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(sample, i) in quickSamples"
                :key="i"
                class="text-xs px-3 py-1.5 rounded-lg glass border border-indigo-500/20 text-indigo-300 hover:border-indigo-500/50 hover:text-indigo-200 transition-all"
                @click="simulatorText = sample"
              >
                {{ sample.slice(0, 30) }}...
              </button>
            </div>
          </div>

          <!-- Text input -->
          <div class="mb-4">
            <label class="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2 block">
              Post Content
            </label>
            <textarea
              id="simulator-input"
              v-model="simulatorText"
              class="input-field min-h-[120px]"
              placeholder="اكتب محتوى البوست هنا... أو Write the post content here..."
              dir="auto"
            />
          </div>

          <!-- Group name -->
          <div class="mb-5">
            <label class="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2 block">
              Group Name (optional)
            </label>
            <input
              v-model="simulatorGroup"
              type="text"
              class="input-field"
              placeholder="e.g. MBA Community Egypt"
            />
          </div>

          <!-- Result -->
          <div
            v-if="simulatorResult"
            class="mb-4 rounded-2xl p-4"
            :class="simulatorResult.is_lead
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-slate-500/10 border border-slate-600/30'"
          >
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">{{ simulatorResult.is_lead ? '✅' : '❌' }}</span>
              <span class="font-semibold text-sm" :class="simulatorResult.is_lead ? 'text-emerald-400' : 'text-slate-400'">
                {{ simulatorResult.is_lead ? 'Lead Detected!' : 'Not a Lead' }}
              </span>
              <span class="ml-auto text-sm font-bold" :class="simulatorResult.is_lead ? 'text-emerald-300' : 'text-slate-400'">
                {{ Math.round(simulatorResult.confidence_score * 100) }}% confidence
              </span>
            </div>
            <p class="text-xs text-slate-300 italic">{{ simulatorResult.summary }}</p>
            <p class="text-xs text-slate-500 mt-1">Intent: {{ simulatorResult.intent_category }}</p>
          </div>

          <div class="flex gap-3">
            <button
              id="btn-run-sim"
              class="btn-primary flex-1 justify-center"
              :disabled="!simulatorText.trim() || isSimulating"
              @click="runSimulation"
            >
              <span v-if="isSimulating" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span v-else>🚀</span>
              {{ isSimulating ? 'Analyzing...' : 'Run Analysis' }}
            </button>
            <button class="btn-ghost" @click="showSimulator = false">Cancel</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLeads } from '~/composables/useLeads'

// Disable SSR — this dashboard requires client-side Supabase Realtime
definePageMeta({ ssr: false })

// SEO
useHead({
  title: 'Brooklyn Business School — MBA Lead Monitor',
  meta: [
    { name: 'description', content: 'Real-time Facebook group lead monitoring and alert system for Brooklyn Business School MBA programs.' },
    { name: 'robots', content: 'noindex, nofollow' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
  ],
})

const { leads, total, isLoading, error, isConnected, leadsOnlyFilter, refresh } = useLeads()

// Stats
const stats = computed(() => {
  const leadsList = leads.value
  const detected = leadsList.filter(l => l.is_lead).length
  const avgConf = detected > 0
    ? Math.round(leadsList.filter(l => l.is_lead).reduce((s, l) => s + l.confidence_score, 0) / detected * 100)
    : 0
  const today = leadsList.filter((l) => {
    const d = new Date(l.created_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length

  return [
    { icon: '📊', label: 'Total Analyzed', value: total.value },
    { icon: '🎯', label: 'Leads Detected', value: detected },
    { icon: '📈', label: 'Avg Confidence', value: `${avgConf}%` },
    { icon: '📅', label: 'Today', value: today },
  ]
})

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

function confidenceClass(score: number) {
  if (score >= 0.8) return 'bg-emerald-500/20 text-emerald-300'
  if (score >= 0.5) return 'bg-yellow-500/20 text-yellow-300'
  return 'bg-slate-500/20 text-slate-400'
}

// Simulator
const showSimulator = ref(false)
const simulatorText = ref('')
const simulatorGroup = ref('')
const isSimulating = ref(false)
const simulatorResult = ref<null | {
  is_lead: boolean
  confidence_score: number
  summary: string
  intent_category: string
}>(null)

const quickSamples = [
  'حد يرشحلي مكان اخد فيه MBA قوي في القاهرة بسرعة؟',
  'عايز اكمل تعليمي وآخد درجة الماجستير في إدارة الأعمال',
  'I am looking for a reputable business school in Cairo for an MBA program',
  'عندي خبرة 5 سنين وعايز اترقى، هل MBA هيفيدني؟',
  'مبروك للزملاء على التخرج! كانت رحلة رائعة',
]

async function runSimulation() {
  if (!simulatorText.value.trim()) return
  isSimulating.value = true
  simulatorResult.value = null

  try {
    const res = await $fetch<{
      is_lead: boolean
      confidence_score: number
      summary: string
      intent_category: string
    }>('/api/test-lead', {
      method: 'POST',
      body: {
        content: simulatorText.value.trim(),
        group_name: simulatorGroup.value.trim() || 'Simulator',
      },
    })
    simulatorResult.value = res
    await refresh()
  }
  catch (err: unknown) {
    console.error('Simulation failed:', err)
    alert('Simulation failed. Check console for details.')
  }
  finally {
    isSimulating.value = false
  }
}
</script>

<style scoped>
.lead-list-enter-active {
  animation: fadeInUp 0.4s ease forwards;
}

.lead-list-leave-active {
  transition: opacity 0.2s ease;
}

.lead-list-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .glass,
.modal-leave-active .glass {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .glass {
  transform: translateY(16px);
  opacity: 0;
}

.modal-leave-to .glass {
  transform: translateY(8px);
  opacity: 0;
}
</style>
