import { createClient } from '@supabase/supabase-js'
import { type H3Event } from 'h3'

export async function getAuthUser(event: H3Event) {
  const authHeader = getHeader(event, 'Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Missing or invalid token format',
    })
  }

  const token = authHeader.substring(7)
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_KEY // Or anon key

  if (!url || !key) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase URL or Key not configured on the server',
    })
  }

  // Create temporary client to retrieve user
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: { user }, error } = await client.auth.getUser(token)

  if (error || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Session invalid or expired',
    })
  }

  return user
}
