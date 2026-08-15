import { sendTelegramAlert } from '../utils/telegram'
import { getAuthUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const body = await readBody<{ telegram_chat_id: string }>(event)

  if (!body?.telegram_chat_id) {
    throw createError({ statusCode: 400, message: 'Missing telegram_chat_id' })
  }

  try {
    await sendTelegramAlert({
      id: 'test-id-123',
      group_name: 'Test Setup Group',
      post_url: 'https://facebook.com/groups/brooklyn-leads',
      post_content: 'This is a test notification from Brooklyn Business School Lead Monitor SaaS Platform to verify that your Chat ID is correct and alert routing works properly!',
      summary: 'إشعار اختبار لتأكيد الاتصال بروبوت التليجرام الخاص بك',
      confidence_score: 1.0,
      intent_category: 'TEST_ALERT',
      sender: user.email,
      created_at: new Date().toISOString(),
      telegram_chat_id: body.telegram_chat_id,
    })

    return {
      success: true,
      message: 'Test message sent successfully',
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      message: `Failed to send Telegram test message: ${error.message || error}`,
    })
  }
})
