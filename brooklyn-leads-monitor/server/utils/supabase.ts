// server/utils/supabase.ts
// Supabase server-side client (uses service key for full access)
import { createClient } from '@supabase/supabase-js'
import { useRuntimeConfig } from '#imports'

let _client: ReturnType<typeof createClient> | null = null

export function useSupabaseServer() {
  if (_client) return _client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_KEY

  if (!url || !key) {
    throw createError({
      statusCode: 500,
      message: 'Supabase configuration missing (SUPABASE_URL or SUPABASE_KEY not set)',
    })
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  })

  return _client
}
