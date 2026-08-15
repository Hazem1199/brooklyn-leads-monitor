import { queryDb } from '../utils/db'
import { getAuthUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(50, Number(query.limit) || 20)
  const leadsOnly = query.leads_only === 'true'
  const offset = (page - 1) * limit

  try {
    // 1. Fetch paginated leads
    const data = await queryDb(
      `SELECT * FROM public.leads 
       WHERE user_id = $1 
         AND group_name != '__SYSTEM_SETTINGS__'
         AND ($2::boolean = false OR is_lead = true)
       ORDER BY created_at DESC 
       LIMIT $3 OFFSET $4`,
      [user.id, leadsOnly, limit, offset]
    )

    // 2. Fetch total count
    const countRows = await queryDb<{ count: number }>(
      `SELECT COUNT(*)::integer as count FROM public.leads 
       WHERE user_id = $1 
         AND group_name != '__SYSTEM_SETTINGS__'
         AND ($2::boolean = false OR is_lead = true)`,
      [user.id, leadsOnly]
    )
    const count = countRows[0]?.count || 0

    return {
      data: data || [],
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message })
  }
})
