// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    // Server-only secrets
    geminiApiKey: process.env.GEMINI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    webhookSecret: process.env.WEBHOOK_SECRET,
    supabaseKey: process.env.SUPABASE_KEY,
    apifyToken: process.env.APIFY_TOKEN,
    duplicateMode: process.env.DUPLICATE_MODE || 'mark',

    // Exposed to client
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    },
  },

  nitro: {
    experimental: {
      openAPI: true,
    },
  },
})
