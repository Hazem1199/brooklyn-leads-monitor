// server/api/webhooks/cloudflare-email.ts
// Ingestion endpoint for Cloudflare Email Routing webhook
// Accepts POST { sender, group_name, post_url, content }
import { analyzeLeadWithGroq } from '../../utils/ai'
import { sendTelegramAlert } from '../../utils/telegram'
import { useSupabaseServer } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  // Only allow POST
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }

  // Validate webhook secret
  const authHeader = getHeader(event, 'x-webhook-secret') || getHeader(event, 'authorization')
  const expectedSecret = process.env.WEBHOOK_SECRET

  if (expectedSecret && authHeader !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized: Invalid webhook secret' })
  }

  // Parse body
  const body = await readBody<{
    sender?: string
    group_name?: string
    post_url?: string
    content?: string
    subject?: string
    from?: string
    to?: string
    raw_body?: string
  }>(event)

  let postContent = ''
  let groupName = 'Facebook Group'
  let postUrl: string | null = null
  let sender = body?.sender || body?.from || null

  // 1. Check if this is a raw email payload from Cloudflare Worker
  if (body?.raw_body) {
    const raw = body.raw_body
    sender = body.from || null

    // Extract Group Name from Subject
    if (body.subject) {
      const subject = body.subject
      const englishMatch = subject.match(/posted in (.+)/i)
      const arabicMatch = subject.match(/(?:نشر في|بالنشر في) (.+)/)
      if (englishMatch) {
        groupName = englishMatch[1].trim()
      } else if (arabicMatch) {
        groupName = arabicMatch[1].trim()
      } else {
        groupName = subject.trim()
      }
    }

    // ── Extract Facebook post URL ────────────────────────────────────────
    // Facebook sends tracking links (l.facebook.com/l.php?u=...) in the email
    // Try direct group post URL first, then fall back to tracking link decode
    const directUrlMatch = raw.match(/https?:\/\/(?:www\.)?facebook\.com\/groups\/[^\s<>"&]+/i)
    if (directUrlMatch) {
      postUrl = directUrlMatch[0].replace(/[.,;)>]+$/, '')
    } else {
      // Try to decode Facebook tracking URL: l.facebook.com/l.php?u=<encoded_url>
      const trackingMatch = raw.match(/https?:\/\/l\.facebook\.com\/l\.php\?u=([^&\s<>"]+)/i)
      if (trackingMatch) {
        try {
          const decoded = decodeURIComponent(trackingMatch[1])
          // Only use if it's a real facebook post/group URL
          if (decoded.includes('facebook.com/groups/') || decoded.includes('facebook.com/permalink/')) {
            postUrl = decoded.replace(/[.,;)>]+$/, '')
          } else {
            // Fall back to the tracking URL itself so there's at least a link
            postUrl = trackingMatch[0].replace(/[.,;)>]+$/, '')
          }
        } catch {
          postUrl = trackingMatch[0].replace(/[.,;)>]+$/, '')
        }
      }
    }

    // ── Extract plain text body from MIME content ────────────────────────
    let plainText = ''
    const boundaryMatch = raw.match(/boundary="?([^"\s;]+)"?/i)
    if (boundaryMatch) {
      const boundary = boundaryMatch[1]
      const parts = raw.split('--' + boundary)
      for (const part of parts) {
        if (part.includes('Content-Type: text/plain')) {
          const headerEnd = part.indexOf('\r\n\r\n')
          if (headerEnd !== -1) {
            plainText = part.substring(headerEnd + 4).trim()
          } else {
            const lfEnd = part.indexOf('\n\n')
            if (lfEnd !== -1) {
              plainText = part.substring(lfEnd + 2).trim()
            }
          }
          break
        }
      }
    }

    if (!plainText) {
      // Fallback if not multipart
      plainText = raw
        .replace(/<[^>]*>/g, '') // remove HTML tags
        .replace(/^[A-Za-z0-9-]+:.*$/gm, '') // remove headers
        .trim()
    }

    // ── Decode Transfer Encoding ─────────────────────────────────────────
    if (raw.includes('Content-Transfer-Encoding: base64')) {
      try {
        plainText = Buffer.from(plainText.replace(/\s/g, ''), 'base64').toString('utf-8')
      } catch (e) {}
    } else if (raw.includes('Content-Transfer-Encoding: quoted-printable')) {
      plainText = plainText
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    }

    // ── Strip Facebook email boilerplate ─────────────────────────────────
    // Remove footer: "This message was sent to..." / "Unsubscribe"
    for (const marker of ['This message was sent to', 'Unsubscribe', 'Facebook, Inc.']) {
      const idx = plainText.indexOf(marker)
      if (idx !== -1) plainText = plainText.substring(0, idx)
    }

    // Remove separator lines (sequences of = or - repeated 5+ times)
    plainText = plainText.replace(/^[=\-_*]{5,}.*$/gm, '')

    // Remove "Hi [Name]," greeting line at the top
    plainText = plainText.replace(/^Hi\s+\w[\w\s]*,?\s*/i, '')

    // Remove lines that are just whitespace / empty after cleanup
    const lines = plainText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)

    // Facebook wraps the post content in double-quotes on its own line — strip them
    // e.g. "جامعة القاهرة بكام وفيه تخصصات ايه MBA"
    const cleanLines = lines.map(l => {
      if ((l.startsWith('"') && l.endsWith('"')) || (l.startsWith('\u201c') && l.endsWith('\u201d'))) {
        return l.slice(1, -1).trim()
      }
      return l
    })

    plainText = cleanLines.join('\n').trim()

    postContent = plainText.slice(0, 1000).trim() || 'Empty email content'
  } else {
    // 2. Otherwise use direct fields from dashboard/simulator
    postContent = String(body?.content || '').trim()
    groupName = String(body?.group_name || 'Unknown Facebook Group').trim()
    postUrl = body?.post_url || null
  }

  if (!postContent) {
    throw createError({ statusCode: 400, message: 'Missing required field: content or raw_body' })
  }

  console.log(`[Webhook] Received post from "${groupName}" — ${postContent.slice(0, 80)}...`)

  const supabase = useSupabaseServer()

  // 1. Fetch all active monitors
  const { data: monitors, error: monitorsError } = await supabase
    .from('monitors')
    .select('*')
    .eq('is_active', true)

  if (monitorsError) {
    console.error('[Webhook] Failed to fetch monitors:', monitorsError.message)
    throw createError({ statusCode: 500, message: 'Database error fetching monitors' })
  }

  // 2. Filter monitors matching groupName or postUrl
  const matchingMonitors = (monitors || []).filter((m) => {
    const nameMatch = m.group_name && groupName && m.group_name.toLowerCase().trim() === groupName.toLowerCase().trim()
    const urlMatch = m.group_url && postUrl && postUrl.toLowerCase().includes(m.group_url.toLowerCase().trim())
    return nameMatch || urlMatch
  })

  console.log(`[Webhook] Matched ${matchingMonitors.length} monitor(s) for post`)

  if (matchingMonitors.length === 0) {
    return {
      success: true,
      message: 'Post did not match any active monitors',
      matched_monitors: 0,
    }
  }

  let processedCount = 0
  let leadsFound = 0

  // 3. Process the post for each matching tenant monitor
  for (const monitor of matchingMonitors) {
    try {
      // Get user profile for personal Telegram Chat ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_chat_id')
        .eq('id', monitor.user_id)
        .single()

      // Run AI analysis using specific monitor's niche keywords & description
      const analysis = await analyzeLeadWithGroq(
        postContent,
        monitor.niche_description || undefined,
        monitor.keywords || undefined
      )

      // Save user-specific lead
      const { data: lead, error: dbError } = await supabase
        .from('leads')
        .insert({
          user_id: monitor.user_id,
          monitor_id: monitor.id,
          group_name: groupName,
          post_url: postUrl,
          post_content: postContent,
          summary: analysis.summary,
          is_lead: analysis.is_lead,
          confidence_score: analysis.confidence_score,
          sender: sender,
        })
        .select()
        .single()

      if (dbError) {
        console.error(`[Webhook] Database error saving lead for user ${monitor.user_id}:`, dbError.message)
        continue
      }

      processedCount++

      if (analysis.is_lead && lead) {
        leadsFound++
        // Send alert to this specific user's Telegram chat id
        await sendTelegramAlert({
          id: lead.id,
          group_name: lead.group_name,
          post_url: lead.post_url,
          post_content: lead.post_content,
          summary: lead.summary,
          confidence_score: lead.confidence_score,
          intent_category: analysis.intent_category,
          sender: lead.sender,
          created_at: lead.created_at,
          telegram_chat_id: profile?.telegram_chat_id || undefined,
        })
      }
    }
    catch (err: unknown) {
      console.error(`[Webhook] Error processing monitor ${monitor.id}:`, err)
    }
  }

  return {
    success: true,
    matched_monitors: matchingMonitors.length,
    processed: processedCount,
    leads_found: leadsFound,
  }
})
