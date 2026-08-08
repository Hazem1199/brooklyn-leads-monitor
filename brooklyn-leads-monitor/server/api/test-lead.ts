// server/api/test-lead.ts
// Test simulator endpoint — sends a mock FB post through the full pipeline
import { analyzeLeadWithGroq } from '../utils/ai'
import { sendTelegramAlert } from '../utils/telegram'
import { useSupabaseServer } from '../utils/supabase'

const SAMPLE_POSTS = [
  {
    content: 'حد يرشحلي مكان اخد فيه MBA قوي في القاهرة بسرعة؟ محتاج حاجة معترف بيها',
    group_name: 'مجموعة المحترفين المصريين',
    post_url: 'https://facebook.com/groups/test/posts/1',
    sender: 'test-simulator@example.com',
  },
  {
    content: 'عايز اكمل تعليمي وآخد درجة الماجستير في إدارة الأعمال. في إيه الفرق بين MBA وMaster of Business?',
    group_name: 'Egyptian MBA Community',
    post_url: 'https://facebook.com/groups/test/posts/2',
    sender: 'test-simulator@example.com',
  },
  {
    content: 'I am looking for a reputable business school in Cairo offering MBA programs. Budget is flexible. Any recommendations?',
    group_name: 'Cairo Business Network',
    post_url: 'https://facebook.com/groups/test/posts/3',
    sender: 'test-simulator@example.com',
  },
  {
    content: 'مبروك للزملاء على التخرج! 🎉 كانت رحلة رائعة معكم في البرنامج',
    group_name: 'Business Graduates Egypt',
    post_url: null,
    sender: 'test-simulator@example.com',
  },
  {
    content: 'عندي خبرة 5 سنين في المبيعات وعايز اترقى لمنصب مدير. هل MBA هيفيدني فعلاً؟',
    group_name: 'Sales Professionals Egypt',
    post_url: 'https://facebook.com/groups/test/posts/5',
    sender: 'test-simulator@example.com',
  },
]

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, message: 'Method Not Allowed' })
  }

  const body = await readBody<{
    content?: string
    group_name?: string
    post_url?: string
    use_sample?: number // 0-4 to pick a sample post
  }>(event)

  let postData: typeof SAMPLE_POSTS[0]

  if (body?.use_sample !== undefined && body.use_sample >= 0 && body.use_sample < SAMPLE_POSTS.length) {
    postData = SAMPLE_POSTS[body.use_sample]
  }
  else if (body?.content) {
    postData = {
      content: body.content,
      group_name: body.group_name || 'Test Simulator',
      post_url: body.post_url || 'https://facebook.com/groups/brooklyn-leads/posts/test_simulated',
      sender: 'test-simulator@localhost',
    }
  }
  else {
    // Default: random sample
    postData = SAMPLE_POSTS[Math.floor(Math.random() * SAMPLE_POSTS.length)]
  }

  console.log('[TestLead] Simulating post:', postData.content.slice(0, 60))

  // Reuse the main webhook logic
  const analysis = await analyzeLeadWithGroq(postData.content)
  const supabase = useSupabaseServer()

  const { data: lead, error: dbError } = await supabase
    .from('leads')
    .insert({
      group_name: postData.group_name,
      post_url: postData.post_url,
      post_content: postData.content,
      summary: analysis.summary,
      is_lead: analysis.is_lead,
      confidence_score: analysis.confidence_score,
      sender: postData.sender,
    })
    .select()
    .single()

  if (dbError) {
    throw createError({ statusCode: 500, message: `DB Error: ${dbError.message}` })
  }

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

  return {
    success: true,
    simulated_post: postData.content,
    is_lead: analysis.is_lead,
    confidence_score: analysis.confidence_score,
    intent_category: analysis.intent_category,
    summary: analysis.summary,
    lead_id: lead?.id,
    telegram_sent: analysis.is_lead,
    sample_posts: SAMPLE_POSTS.map((p, i) => ({ index: i, preview: p.content.slice(0, 60) })),
  }
})
