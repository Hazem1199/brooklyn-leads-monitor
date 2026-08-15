import { queryDb } from '../../utils/db'
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

  try {
    const rows = await queryDb(
      `INSERT INTO public.monitors (user_id, group_name, group_url, niche_description, keywords, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        user.id,
        body.group_name.trim(),
        body.group_url?.trim() || null,
        body.niche_description?.trim() || null,
        body.keywords?.trim() || null,
        true
      ]
    )
    return {
      success: true,
      data: rows[0]
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message })
  }
})
