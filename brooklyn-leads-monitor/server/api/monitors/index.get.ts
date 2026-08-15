import { useSupabaseServer } from '../../utils/supabase'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const supabase = useSupabaseServer()

  const { data, error } = await supabase
    .from('monitors')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    success: true,
    data: data || []
  }
})
