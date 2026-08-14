// server/utils/telegram.ts
// Telegram Bot API integration for real-time lead alerts

export interface LeadAlertData {
  id: string
  group_name: string
  post_url?: string | null
  post_content: string
  summary: string
  confidence_score: number
  intent_category?: string
  sender?: string | null
  created_at: string
  is_duplicate?: boolean
}

export async function sendTelegramAlert(leadData: LeadAlertData): Promise<void> {
  const config = useRuntimeConfig()
  const botToken = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN
  const chatId = config.telegramChatId || process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('[Telegram] BOT_TOKEN or CHAT_ID not set — skipping alert')
    return
  }

  const confidencePercent = Math.round(leadData.confidence_score * 100)
  const emoji = confidencePercent >= 80 ? '🔥' : confidencePercent >= 60 ? '⚡' : '📌'
  const postLink = leadData.post_url ? `\n🔗 <a href="${escapeHtml(leadData.post_url)}">View Post</a>` : ''
  const postSnippet = leadData.post_content.slice(0, 400) + (leadData.post_content.length > 400 ? '...' : '')

  const headerText = leadData.is_duplicate 
    ? `⚠️ <b>[مكرر - DUPLICATE]</b>\n${emoji} <b>New MBA Lead Detected!</b>` 
    : `${emoji} <b>New MBA Lead Detected!</b>`

  const message = [
    headerText,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📊 <b>Confidence:</b> ${confidencePercent}%`,
    `🎓 <b>Intent:</b> ${escapeHtml(leadData.intent_category || 'LEAD_INQUIRY')}`,
    `👥 <b>Group:</b> ${escapeHtml(leadData.group_name)}`,
    ``,
    `💬 <b>Post Content:</b>`,
    `<i>${escapeHtml(postSnippet)}</i>`,
    ``,
    `📝 <b>Summary:</b> ${escapeHtml(leadData.summary)}`,
    postLink,
    ``,
    `⏰ ${new Date(leadData.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`,
    ``,
    `🏫 <b>Brooklyn Business School — Lead Monitor</b>`,
  ].join('\n')

  try {
    await $fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      },
    })
    console.log('[Telegram] Alert sent successfully for lead:', leadData.id)
  }
  catch (error) {
    // Non-fatal: log but don't throw (lead is already saved)
    console.error('[Telegram] Failed to send alert:', error)
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

