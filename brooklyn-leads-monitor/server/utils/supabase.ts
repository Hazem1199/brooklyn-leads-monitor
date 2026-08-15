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

let _adminClient: ReturnType<typeof createClient> | null = null

export function useSupabaseAdmin() {
  if (_adminClient) return _adminClient

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY

  if (!url || !key) {
    throw createError({
      statusCode: 500,
      message: 'Supabase admin configuration missing (SUPABASE_URL or keys not set)',
    })
  }

  _adminClient = createClient(url, key, {
    auth: { persistSession: false },
  })

  return _adminClient
}
