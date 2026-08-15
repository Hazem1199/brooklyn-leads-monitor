import { useSupabaseServer } from '../../utils/supabase'

interface TelegramUpdate {
  message?: {
    chat: {
      id: number
      type: string
    }
    text?: string
    from?: {
      id: number
      first_name?: string
      username?: string
    }
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<TelegramUpdate>(event)
  
  if (!body || !body.message) {
    return { success: true, message: 'No message in update' }
  }

  const chat = body.message.chat
  const text = (body.message.text || '').trim()

  // Look for /start command followed by a user_id
  // Format: /start <user_id>
  if (text.startsWith('/start ')) {
    const parts = text.split(' ')
    const userId = parts[1]?.trim()

    if (userId) {
      const supabase = useSupabaseServer()

      // Update profiles telegram_chat_id in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: String(chat.id) })
        .eq('id', userId)

      if (error) {
        console.error('[Telegram Webhook] Failed to update profile:', error.message)
        await sendTelegramReply(chat.id, '❌ حدث خطأ أثناء ربط حسابك بالمنصة. يرجى المحاولة لاحقاً.')
        return { success: false, error: error.message }
      }

      console.log(`[Telegram Webhook] Successfully linked user ${userId} to chat ${chat.id}`)
      
      // Reply success
      await sendTelegramReply(
        chat.id, 
        '🎉 تم ربط حسابك في المنصة بنجاح!\n\nستصلك الآن تنبيهات المنشورات والعملاء المحتملين هنا فور حدوثها.'
      )
      return { success: true, linked: true, user_id: userId, chat_id: chat.id }
    }
  }

  // Fallback reply if they send other messages
  await sendTelegramReply(
    chat.id, 
    'مرحباً! هذا البوت مخصص لإرسال تنبيهات المنصة تلقائياً.\n\nيرجى الضغط على زر الربط التلقائي في إعدادات لوحة التحكم لتفعيل الخدمة.'
  )
  return { success: true }
})

async function sendTelegramReply(chatId: number, message: string) {
  const config = useRuntimeConfig()
  const botToken = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.warn('[Telegram Webhook] Cannot send reply: BOT_TOKEN is missing')
    return
  }

  try {
    await $fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text: message,
      },
    })
  } catch (err) {
    console.error(`[Telegram Webhook] Failed to send Telegram reply to ${chatId}:`, err)
  }
}
