import { useSupabaseServer } from '../utils/supabase'
import { getAuthUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const method = getMethod(event)
  const supabase = useSupabaseServer()

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }

    return {
      success: true,
      data
    }
  }

  if (method === 'POST') {
    const body = await readBody<{ telegram_chat_id: string }>(event)
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        telegram_chat_id: body?.telegram_chat_id?.trim() || null
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }

    return {
      success: true,
      data
    }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})
