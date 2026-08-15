import { useSupabaseServer } from '../../utils/supabase'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const body = await readBody<{
    group_name: string
    group_url?: string
    niche_description?: string
    keywords?: string
  }>(event)

  if (!body?.group_name) {
    throw createError({ statusCode: 400, message: 'Missing group_name' })
  }

  const supabase = useSupabaseServer()

  const { data, error } = await supabase
    .from('monitors')
    .insert({
      user_id: user.id,
      group_name: body.group_name.trim(),
      group_url: body.group_url?.trim() || null,
      niche_description: body.niche_description?.trim() || null,
      keywords: body.keywords?.trim() || null,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    success: true,
    data
  }
})
