<template>
  <div class="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 font-sans">
    <!-- Sidebar navigation -->
    <aside class="w-full md:w-64 bg-slate-900/60 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col justify-between shrink-0">
      <div>
        <!-- Platform Logo -->
        <div class="p-6 border-b border-slate-800/60 flex items-center gap-3">
          <span class="text-2xl">🏫</span>
          <div>
            <h1 class="text-sm font-black tracking-tight text-white">Brooklyn Monitor</h1>
            <span class="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Multi-Tenant SaaS</span>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="p-4 space-y-1">
          <NuxtLink
            to="/"
            class="flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-semibold hover:bg-slate-800/50 hover:text-white"
            active-class="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold"
          >
            <span class="text-lg">📊</span> Overview
          </NuxtLink>
          <NuxtLink
            to="/monitors"
            class="flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-semibold hover:bg-slate-800/50 hover:text-white"
            active-class="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold"
          >
            <span class="text-lg">🎯</span> My Monitors
          </NuxtLink>
          <NuxtLink
            to="/leads"
            class="flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-semibold hover:bg-slate-800/50 hover:text-white"
            active-class="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold"
          >
            <span class="text-lg">📥</span> Detected Leads
          </NuxtLink>
          <NuxtLink
            to="/settings"
            class="flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 text-sm font-semibold hover:bg-slate-800/50 hover:text-white"
            active-class="bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold"
          >
            <span class="text-lg">⚙️</span> Settings
          </NuxtLink>
        </nav>
      </div>

      <!-- User Profile / Logout footer -->
      <div v-if="user" class="p-4 border-t border-slate-800/60 bg-slate-900/40">
        <div class="flex items-center gap-3 mb-3.5">
          <div class="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-sm">
            {{ user.email?.[0].toUpperCase() }}
          </div>
          <div class="overflow-hidden">
            <p class="text-xs font-bold text-white truncate" :title="user.email">{{ user.email }}</p>
            <span class="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">Free Plan</span>
          </div>
        </div>
        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-400 text-xs font-bold text-slate-400 transition-all duration-200"
        >
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col overflow-y-auto">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '../composables/useAuth'
import { onMounted } from 'vue'

const { user, initAuth, logout } = useAuth()

onMounted(async () => {
  await initAuth()
})

async function handleLogout() {
  try {
    await logout()
  } catch (err) {
    console.error('Logout failed:', err)
  }
}
</script>

<style scoped>
nav a {
  border: 1px solid transparent;
}
</style>
