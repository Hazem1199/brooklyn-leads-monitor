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
  }>(event)

  if (!body?.content) {
    throw createError({ statusCode: 400, message: 'Missing required field: content' })
  }

  const postContent = String(body.content).trim()
  const groupName = String(body.group_name || 'Unknown Facebook Group').trim()
  const postUrl = body.post_url || null
  const sender = body.sender || null

  console.log(`[Webhook] Received post from "${groupName}" — ${postContent.slice(0, 80)}...`)

  // Step 1: Analyze with Groq AI
  const analysis = await analyzeLeadWithGroq(postContent)
  console.log(`[Webhook] AI Result: is_lead=${analysis.is_lead}, confidence=${analysis.confidence_score}`)

  // Step 2: Save to Supabase
  const supabase = useSupabaseServer()
  const { data: lead, error: dbError } = await supabase
    .from('leads')
    .insert({
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
    console.error('[Webhook] Database error:', dbError)
    throw createError({ statusCode: 500, message: `Database error: ${dbError.message}` })
  }

  console.log(`[Webhook] Saved to DB with id: ${lead.id}`)

  // Step 3: Send Telegram alert if it's a lead
  if (analysis.is_lead && lead) {
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
    })
  }

  // Return response
  return {
    success: true,
    is_lead: analysis.is_lead,
    confidence_score: analysis.confidence_score,
    summary: analysis.summary,
    lead_id: lead?.id,
  }
})
