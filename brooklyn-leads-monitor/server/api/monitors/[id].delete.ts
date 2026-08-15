import { useSupabaseServer } from '../../utils/supabase'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing monitor ID' })
  }

  const supabase = useSupabaseServer()

  const { error } = await supabase
    .from('monitors')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // Ensure users can only delete their own monitors

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    success: true,
    message: 'Monitor deleted successfully'
  }
})
