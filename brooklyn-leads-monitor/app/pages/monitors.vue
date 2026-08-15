<template>
  <NuxtLayout name="default">
    <div class="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      <!-- Header section -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-black text-white tracking-tight">Niche Monitors Setup</h2>
          <p class="text-slate-400 text-sm mt-1">Manage target Facebook groups and define customized AI scoring parameters</p>
        </div>
        <button
          @click="showAddModal = true"
          class="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <span>➕</span> Add New Monitor
        </button>
      </div>

      <!-- Loading / Empty states -->
      <div v-if="isLoading" class="glass rounded-3xl p-16 border border-slate-800 flex flex-col items-center justify-center gap-3">
        <div class="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span class="text-xs text-slate-400">Loading monitors...</span>
      </div>

      <div v-else-if="monitors.length === 0" class="glass rounded-3xl p-16 border border-slate-800 text-center max-w-lg mx-auto space-y-4">
        <div class="text-5xl">🎯</div>
        <h3 class="text-lg font-bold text-white">No active monitors</h3>
        <p class="text-slate-400 text-sm leading-relaxed">
          Setup custom monitors for Facebook Groups. You can define specific niches (e.g., MBA, Software, Properties) and matching keywords to instruct our AI classifier.
        </p>
        <button @click="showAddModal = true" class="btn-primary">
          Create Your First Monitor
        </button>
      </div>

      <!-- Monitors Cards Grid -->
      <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="monitor in monitors"
          :key="monitor.id"
          class="glass rounded-3xl p-6 border border-slate-800 hover:border-slate-700/80 transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <!-- Group Header -->
            <div class="flex items-start justify-between gap-3 mb-4">
              <div class="min-w-0">
                <h4 class="font-bold text-white text-base truncate leading-snug">{{ monitor.group_name }}</h4>
                <a
                  v-if="monitor.group_url"
                  :href="monitor.group_url"
                  target="_blank"
                  class="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 mt-1 font-semibold"
                >
                  🔗 Facebook Group Link
                </a>
                <span v-else class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">No group link</span>
              </div>
              <span :class="['text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider', monitor.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400']">
                {{ monitor.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <!-- Niche Details -->
            <div class="space-y-3.5 mb-6">
              <div>
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Niche Classification Description</span>
                <p class="text-xs text-slate-300 font-medium leading-relaxed bg-slate-950/40 p-3 rounded-2xl border border-slate-900/60">
                  {{ monitor.niche_description }}
                </p>
              </div>

              <div>
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">Niche Keywords</span>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="keyword in monitor.keywords?.split(',')"
                    :key="keyword"
                    class="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-lg font-semibold"
                  >
                    {{ keyword.trim() }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4 border-t border-slate-900">
            <span class="text-[10px] text-slate-500 font-bold">
              Added: {{ formatDate(monitor.created_at) }}
            </span>
            <button
              @click="deleteMonitor(monitor.id)"
              class="text-xs text-rose-400 hover:text-rose-300 font-bold transition-colors px-2 py-1 hover:bg-rose-500/10 rounded-xl"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Monitor Modal -->
    <Transition name="modal">
      <div
        v-if="showAddModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        @click.self="showAddModal = false"
      >
        <div class="glass rounded-3xl p-6 w-full max-w-lg border border-indigo-500/30 shadow-2xl relative">
          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-lg font-bold text-white">🎯 Monitor Target Setup</h3>
              <p class="text-xs text-slate-400 mt-0.5">Customize classification rules for specific niches</p>
            </div>
            <button
              class="w-8 h-8 rounded-full glass border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              @click="showAddModal = false"
            >
              ✕
            </button>
          </div>

          <form @submit.prevent="createMonitor" class="space-y-4">
            <!-- Group Name -->
            <div>
              <label class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">
                Facebook Group Name (Case Insensitive Match)
              </label>
              <input
                v-model="newGroup.group_name"
                type="text"
                required
                class="input-field"
                placeholder="e.g. MBA Community Egypt"
              />
            </div>

            <!-- Group URL -->
            <div>
              <label class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">
                Facebook Group URL (Optional)
              </label>
              <input
                v-model="newGroup.group_url"
                type="url"
                class="input-field"
                placeholder="https://facebook.com/groups/..."
              />
            </div>

            <!-- Niche Description -->
            <div>
              <label class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">
                Target Niche Description (For AI scoring)
              </label>
              <textarea
                v-model="newGroup.niche_description"
                required
                class="input-field min-h-[80px]"
                placeholder="Describe your target audience, e.g. Students inquiring about MBA degrees, Master's in Business Administration, or executive diplomas."
              />
            </div>

            <!-- Keywords -->
            <div>
              <label class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">
                Target Keywords (Comma Separated)
              </label>
              <input
                v-model="newGroup.keywords"
                type="text"
                required
                class="input-field"
                placeholder="mba, ماجستير, بيزنس, إدارة أعمال, دبلومة"
              />
            </div>

            <!-- Action buttons -->
            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                :disabled="isSaving"
                class="btn-primary flex-1 justify-center py-3"
              >
                <span v-if="isSaving" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {{ isSaving ? 'Creating...' : 'Create Monitor' }}
              </button>
              <button type="button" class="btn-ghost" @click="showAddModal = false">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useHead } from '#imports'

definePageMeta({
  middleware: 'auth',
  ssr: false
})

useHead({
  title: 'My Monitors — Lead Monitor'
})

const { authFetch } = useAuth()

const monitors = ref<any[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const showAddModal = ref(false)

const newGroup = ref({
  group_name: '',
  group_url: '',
  niche_description: '',
  keywords: ''
})

onMounted(async () => {
  await fetchMonitors()
})

async function fetchMonitors() {
  isLoading.value = true
  try {
    const res = await authFetch<{ success: boolean; data: any[] }>('/api/monitors')
    monitors.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch monitors:', err)
  } finally {
    isLoading.value = false
  }
}

async function createMonitor() {
  isSaving.value = true
  try {
    const res = await authFetch<{ success: boolean; data: any }>('/api/monitors', {
      method: 'POST',
      body: newGroup.value
    })
    
    if (res.success) {
      monitors.value.unshift(res.data)
      showAddModal.value = false
      // Reset form
      newGroup.value = {
        group_name: '',
        group_url: '',
        niche_description: '',
        keywords: ''
      }
    }
  } catch (err) {
    console.error('Failed to create monitor:', err)
    alert('Failed to create monitor. Please check parameters.')
  } finally {
    isSaving.value = false
  }
}

async function deleteMonitor(id: string) {
  if (!confirm('Are you sure you want to delete this monitor? All scoped leads matching this monitor will lose their reference.')) return
  
  try {
    await authFetch(`/api/monitors/${id}`, {
      method: 'DELETE'
    })
    monitors.value = monitors.value.filter(m => m.id !== id)
  } catch (err) {
    console.error('Failed to delete monitor:', err)
    alert('Failed to delete monitor.')
  }
}

// Helpers
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-EG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
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
