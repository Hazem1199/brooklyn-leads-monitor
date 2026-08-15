import { useSupabaseServer } from '../utils/supabase'
import { getAuthUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Number(query.limit) || 20)
  const leadsOnly = query.leads_only === 'true'
  const offset = (page - 1) * limit

  const supabase = useSupabaseServer()

  let queryBuilder = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .neq('group_name', '__SYSTEM_SETTINGS__')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (leadsOnly) {
    queryBuilder = queryBuilder.eq('is_lead', true)
  }

  const { data, error, count } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  }
})
