// server/api/webhooks/apify.post.ts
// Receives Apify webhook after a Facebook Posts Scraper run completes,
// fetches posts from the dataset, runs AI analysis, saves leads, and alerts via Telegram.

import { analyzeLeadWithGroq } from '../../utils/ai'
import { sendTelegramAlert } from '../../utils/telegram'
import { useSupabaseServer } from '../../utils/supabase'

// ── Apify webhook payload ──────────────────────────────────────────────────
interface ApifyWebhookPayload {
  eventType: string // e.g. "ACTOR.RUN.SUCCEEDED"
  eventData?: {
    actorId?: string
    actorRunId?: string
    actorTaskId?: string
  }
  resource?: {
    id?: string
    defaultDatasetId?: string
    status?: string
  }
}

// ── Facebook post item from apify/facebook-posts-scraper ──────────────────
interface ApifyFacebookPost {
  // Post identifiers
  postId?: string
  url?: string
  permalink?: string
  facebookUrl?: string

  // Content
  text?: string
  message?: string

  // Source / group name
  pageName?: string
  groupName?: string
  pageOrGroupName?: string

  // Author
  user?: {
    name?: string
    profileUrl?: string
  }
  authorName?: string

  // Timestamps
  time?: string
  timeCreated?: string
  timestamp?: number
  timestampCreated?: number

  // Extras (we ignore engagement metrics but keep structure open)
  [key: string]: unknown
}

export default defineEventHandler(async (event) => {
  // ── 1. Validate webhook secret ───────────────────────────────────────────
  const authHeader = getHeader(event, 'x-webhook-secret') || getHeader(event, 'authorization')
  const expectedSecret = process.env.WEBHOOK_SECRET

  if (expectedSecret && authHeader !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    throw createError({ statusCode: 401, message: 'Unauthorized: Invalid webhook secret' })
  }

  // ── 2. Parse Apify webhook payload ────────────────────────────────────────
  const body = await readBody<ApifyWebhookPayload>(event)

  // Only process successful runs
  if (body?.eventType && body.eventType !== 'ACTOR.RUN.SUCCEEDED') {
    console.log(`[Apify] Ignoring event type: ${body.eventType}`)
    return { success: true, skipped: true, reason: `Event type ${body.eventType} ignored` }
  }

  const datasetId = body?.resource?.defaultDatasetId
  const runId = body?.resource?.id || body?.eventData?.actorRunId

  if (!datasetId) {
    console.warn('[Apify] No defaultDatasetId in webhook payload')
    throw createError({ statusCode: 400, message: 'Missing resource.defaultDatasetId in payload' })
  }

  console.log(`[Apify] Run ${runId} succeeded. Fetching dataset: ${datasetId}`)

  // ── 3. Fetch posts from Apify dataset ─────────────────────────────────────
  const config = useRuntimeConfig()
  const apifyToken = config.apifyToken || process.env.APIFY_TOKEN

  if (!apifyToken) {
    throw createError({ statusCode: 500, message: 'APIFY_TOKEN not configured on server' })
  }

  let posts: ApifyFacebookPost[] = []
  try {
    posts = await $fetch<ApifyFacebookPost[]>(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
      {
        params: { token: apifyToken, format: 'json', clean: 'true' },
      },
    )
  }
  catch (err) {
    console.error('[Apify] Failed to fetch dataset items:', err)
    throw createError({ statusCode: 502, message: 'Failed to fetch Apify dataset items' })
  }

  console.log(`[Apify] Fetched ${posts.length} posts from dataset ${datasetId}`)

  if (!posts.length) {
    return { success: true, processed: 0, message: 'Dataset is empty' }
  }

  // ── 4. Process each post ─────────────────────────────────────────────────
  const supabase = useSupabaseServer()
  let leadsFound = 0
  let processed = 0
  const errors: string[] = []

  for (const post of posts) {
    try {
      // Extract text content
      const postContent = (post.text || post.message || '').trim()
      if (!postContent) {
        console.log('[Apify] Skipping post with no text content')
        continue
      }

      // Extract group / page name
      const groupName = (
        post.groupName
        || post.pageOrGroupName
        || post.pageName
        || 'Facebook Group'
      ).trim()

      // Extract post URL (prefer direct permalink)
      const postUrl = post.permalink || post.url || post.facebookUrl || null

      // Extract sender (author name or profile URL)
      const sender = post.user?.name || post.authorName || null

      // ── Duplicate Detection ──────────────────────────────────────────
      const { data: existingLeads, error: checkError } = await supabase
        .from('leads')
        .select('is_lead, confidence_score, summary')
        .eq('post_content', postContent.slice(0, 1000))
        .order('created_at', { ascending: false })
        .limit(1)

      if (checkError) {
        console.error('[Apify] Error checking duplicate:', checkError.message)
      }

      const isDuplicate = existingLeads && existingLeads.length > 0
      const duplicateMode = config.duplicateMode || 'mark'

      if (isDuplicate && duplicateMode === 'skip') {
        console.log(`[Apify] Duplicate post detected. Skipping as duplicateMode is "skip": ${postContent.slice(0, 80)}...`)
        continue
      }

      let analysis
      let isDuplicateMarked = false

      if (isDuplicate && duplicateMode === 'mark') {
        console.log('[Apify] Duplicate post detected. duplicateMode is "mark". Re-using previous AI analysis.')
        const prev = existingLeads![0]
        const cleanSummary = prev.summary.startsWith('[مكرر]') ? prev.summary : `[مكرر] ${prev.summary}`
        analysis = {
          is_lead: prev.is_lead,
          confidence_score: prev.confidence_score,
          summary: cleanSummary,
          intent_category: 'Duplicate Inquiry',
        }
        isDuplicateMarked = true
      }
      else {
        console.log(`[Apify] Analyzing post from "${groupName}": ${postContent.slice(0, 80)}...`)
        analysis = await analyzeLeadWithGroq(postContent)
        console.log(`[Apify] AI result: is_lead=${analysis.is_lead}, confidence=${analysis.confidence_score}`)
      }

      // ── Save to Supabase ───────────────────────────────────────────────
      const { data: lead, error: dbError } = await supabase
        .from('leads')
        .insert({
          group_name: groupName,
          post_url: postUrl,
          post_content: postContent.slice(0, 1000),
          summary: analysis.summary,
          is_lead: analysis.is_lead,
          confidence_score: analysis.confidence_score,
          sender: sender,
        })
        .select()
        .single()

      if (dbError) {
        console.error('[Apify] DB error for post:', dbError.message)
        errors.push(dbError.message)
        continue
      }

      processed++

      // ── Telegram alert if lead ─────────────────────────────────────────
      if (analysis.is_lead && lead) {
        leadsFound++
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
          is_duplicate: isDuplicateMarked,
        })
      }
    }
    catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[Apify] Error processing post:', msg)
      errors.push(msg)
    }
  }

  console.log(`[Apify] Done. Processed: ${processed}, Leads found: ${leadsFound}, Errors: ${errors.length}`)

  return {
    success: true,
    run_id: runId,
    dataset_id: datasetId,
    total_posts: posts.length,
    processed,
    leads_found: leadsFound,
    errors: errors.length > 0 ? errors : undefined,
  }
})
