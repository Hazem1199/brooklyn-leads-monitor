import { queryDb } from '../utils/db'
import { getAuthUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const method = getMethod(event)

  if (method === 'GET') {
    try {
      const rows = await queryDb('SELECT * FROM public.profiles WHERE id = $1', [user.id])
      const profile = rows[0] || null

      if (!profile) {
        // Fallback: create profile if not exists (safeguard)
        await queryDb('INSERT INTO public.profiles (id, email, plan) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING', [user.id, user.email, 'free'])
        const freshRows = await queryDb('SELECT * FROM public.profiles WHERE id = $1', [user.id])
        return {
          success: true,
          data: freshRows[0] || null
        }
      }

      return {
        success: true,
        data: profile
      }
    } catch (err: any) {
      throw createError({ statusCode: 500, message: err.message })
    }
  }

  if (method === 'POST') {
    try {
      const body = await readBody<{ telegram_chat_id: string }>(event)
      const targetChatId = body?.telegram_chat_id?.trim() || null
      
      const rows = await queryDb(
        'UPDATE public.profiles SET telegram_chat_id = $1 WHERE id = $2 RETURNING *',
        [targetChatId, user.id]
      )

      return {
        success: true,
        data: rows[0] || null
      }
    } catch (err: any) {
      throw createError({ statusCode: 500, message: err.message })
    }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})
