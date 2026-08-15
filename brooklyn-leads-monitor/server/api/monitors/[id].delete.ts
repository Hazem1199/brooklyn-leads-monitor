import { queryDb } from '../../utils/db'
import { getAuthUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing monitor ID' })
  }

  try {
    await queryDb(
      'DELETE FROM public.monitors WHERE id = $1 AND user_id = $2',
      [id, user.id]
    )
    return {
      success: true,
      message: 'Monitor deleted successfully'
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message })
  }
})
