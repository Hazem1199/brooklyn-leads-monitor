import { getSystemSettings, saveSystemSettings } from '../utils/settings'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    return await getSystemSettings()
  }

  if (method === 'POST') {
    const body = await readBody<{ skipDuplicates: boolean }>(event)
    if (!body || typeof body.skipDuplicates !== 'boolean') {
      throw createError({ statusCode: 400, message: 'Invalid settings format' })
    }
    await saveSystemSettings(body)
    return { success: true, settings: body }
  }

  throw createError({ statusCode: 405, message: 'Method Not Allowed' })
})
