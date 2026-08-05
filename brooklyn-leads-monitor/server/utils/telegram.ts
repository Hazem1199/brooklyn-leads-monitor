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
}

export async function sendTelegramAlert(leadData: LeadAlertData): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('[Telegram] BOT_TOKEN or CHAT_ID not set — skipping alert')
    return
  }

  const confidencePercent = Math.round(leadData.confidence_score * 100)
  const emoji = confidencePercent >= 80 ? '🔥' : confidencePercent >= 60 ? '⚡' : '📌'
  const postLink = leadData.post_url ? `\n🔗 [View Post](${leadData.post_url})` : ''

  const message = [
    `${emoji} *New MBA Lead Detected!*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📊 *Confidence:* ${confidencePercent}%`,
    `🎓 *Intent:* ${leadData.intent_category || 'SEEKING_MBA'}`,
    `👥 *Group:* ${escapeMarkdown(leadData.group_name)}`,
    ``,
    `💬 *Post Content:*`,
    `_${escapeMarkdown(leadData.post_content.slice(0, 400))}${leadData.post_content.length > 400 ? '...' : ''}_`,
    ``,
    `📝 *Summary:* ${escapeMarkdown(leadData.summary)}`,
    postLink,
    ``,
    `⏰ ${new Date(leadData.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`,
    ``,
    `🏫 *Brooklyn Business School — Lead Monitor*`,
  ].join('\n')

  try {
    await $fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      },
    })
    console.log('[Telegram] Alert sent successfully for lead:', leadData.id)
  }
  catch (error) {
    // Non-fatal: log but don't throw (lead is already saved)
    console.error('[Telegram] Failed to send alert:', error)
  }
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}
