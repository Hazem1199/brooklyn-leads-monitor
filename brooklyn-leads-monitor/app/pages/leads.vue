<template>
  <NuxtLayout name="default">
    <div class="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-white tracking-tight">Detected Leads Feed</h2>
          <p class="text-slate-400 text-sm mt-1">Real-time list of parsed Facebook posts matching your niche monitors</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <!-- Leads Only filter -->
          <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl hover:border-slate-700">
            <input
              v-model="leadsOnlyFilter"
              type="checkbox"
              class="w-4 h-4 rounded accent-indigo-500"
              @change="refresh"
            />
            Leads Only
          </label>
          <!-- Refresh -->
          <button
            class="btn-ghost flex items-center gap-2 py-2.5 text-xs font-semibold"
            :disabled="isLoading"
            @click="refresh"
          >
            <span :class="[isLoading && 'animate-spin inline-block']">↻</span>
            Refresh
          </button>
        </div>
      </div>

      <!-- Loading / Empty / Data states -->
      <div v-if="isLoading && leads.length === 0" class="glass rounded-3xl p-16 border border-slate-800 flex flex-col items-center justify-center gap-3">
        <div class="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span class="text-xs text-slate-400">Loading leads...</span>
      </div>

      <div v-else-if="leads.length === 0" class="glass rounded-3xl p-16 border border-slate-800 text-center max-w-md mx-auto space-y-4">
        <div class="text-5xl">📥</div>
        <h3 class="text-lg font-bold text-white">No leads detected</h3>
        <p class="text-slate-400 text-sm leading-relaxed">
          No Facebook posts have been scored as leads yet. Setup active monitors, link your Cloudflare routing, and run simulations to begin collecting.
        </p>
      </div>

      <!-- Leads Feed list -->
      <div v-else class="space-y-4">
        <div class="text-xs text-slate-400 font-bold px-1">
          Showing {{ leads.length }} of {{ total }} leads
        </div>

        <TransitionGroup name="lead-list">
          <article
            v-for="(lead, i) in leads"
            :key="lead.id"
            class="glass rounded-3xl p-6 border transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 animate-fade-in-up"
            :class="lead.is_lead ? 'border-emerald-500/10' : 'border-slate-800'"
            :style="{ animationDelay: `${i * 30}ms` }"
            :dir="isArabic(lead.post_content) ? 'rtl' : 'ltr'"
          >
            <div class="flex flex-col md:flex-row items-start justify-between gap-4">
              <!-- Left Column: Content details -->
              <div class="flex-1 min-w-0 space-y-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <span :class="lead.is_lead ? 'badge-lead' : 'badge-not-lead'">
                    {{ lead.is_lead ? '✓ Lead' : '✗ Not a Lead' }}
                  </span>
                  <span v-if="lead.summary?.startsWith('[مكرر]')" class="badge-duplicate">
                    ⚠️ مكرر
                  </span>
                  <span class="text-xs text-slate-400 font-bold">
                    👥 {{ lead.group_name }}
                  </span>
                  <span class="text-xs text-slate-500 font-semibold">
                    {{ formatDate(lead.created_at) }}
                  </span>
                </div>

                <!-- Post Text Content -->
                <p class="text-sm text-slate-200 font-medium leading-relaxed">
                  {{ lead.post_content }}
                </p>

                <!-- AI parsed Summary -->
                <div class="p-3.5 bg-slate-950/40 border border-slate-900 rounded-2xl">
                  <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">AI Classification Summary</span>
                  <p class="text-xs text-slate-300 leading-relaxed font-medium">
                    💡 {{ lead.summary?.replace(/^\[مكرر\]\s*/, '') }}
                  </p>
                </div>

                <!-- Sender info / Post links -->
                <div class="flex items-center gap-3 pt-1 flex-wrap" dir="ltr">
                  <span v-if="lead.sender" class="text-[10px] text-slate-400 bg-slate-900 border border-slate-800/80 px-2.5 py-1 rounded-xl font-semibold">
                    👤 Author: {{ lead.sender }}
                  </span>
                  <a
                    v-if="lead.post_url"
                    :href="lead.post_url"
                    target="_blank"
                    class="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline"
                  >
                    🔗 View Facebook Post
                  </a>
                </div>
              </div>

              <!-- Right Column: Confidence Score circle -->
              <div class="w-full md:w-auto flex flex-col items-center justify-center shrink-0" dir="ltr">
                <div
                  class="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border"
                  :class="confidenceClass(lead.confidence_score)"
                >
                  <span class="text-xl font-black leading-none">{{ Math.round(lead.confidence_score * 100) }}</span>
                  <span class="text-[9px] font-bold opacity-75 mt-0.5">%</span>
                </div>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">Confidence</p>
              </div>
            </div>
          </article>
        </TransitionGroup>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useLeads } from '~/composables/useLeads'
import { useHead } from '#imports'

definePageMeta({
  middleware: 'auth',
  ssr: false
})

useHead({
  title: 'Leads Feed — Lead Monitor'
})

const { leads, total, isLoading, leadsOnlyFilter, refresh } = useLeads()

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
  if (score >= 0.8) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-inner'
  if (score >= 0.5) return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
  return 'bg-slate-900 border-slate-800 text-slate-400'
}
</script>

<style scoped>
.glass {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(16px);
}
</style>
