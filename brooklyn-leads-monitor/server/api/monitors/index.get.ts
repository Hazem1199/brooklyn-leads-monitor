import { queryDb } from '../../utils/db'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)

  try {
    const data = await queryDb(
      'SELECT * FROM public.monitors WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    )
    return {
      success: true,
      data
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message })
  }
})
