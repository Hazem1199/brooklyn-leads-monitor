// server/utils/ai.ts
// Groq API integration for lead intent classification (OpenAI-compatible)

export interface LeadAnalysisResult {
  is_lead: boolean
  confidence_score: number
  summary: string
  intent_category: string
}

const SYSTEM_PROMPT = `You are an expert AI Lead Scoring Classifier for Brooklyn Business School in Egypt.
Your goal is to identify potential students (Leads) inquiring about or seeking recommendations for MBA degrees, Master's in Business Administration, or professional management diplomas in Egypt.

CRITICAL RULES FOR CLASSIFICATION:
1. A post IS A LEAD (is_lead: true, confidence >= 0.85, intent: "LEAD_INQUIRY") if the author is:
   - Asking for recommendations or advice for MBA / Business Master's / Management courses in Egypt (e.g., "حد يعرف مكان كويس أدرس فيه MBA", "حد يرشحلي مكان اخد فيه MBA", "عايز ادرس MBA", "اروح فين اخد ماجستير بيزنس").
   - Inquiring about MBA tuition fees, accreditations, or admission requirements in Egypt.
   - Mentioning Brooklyn Business School, ESLSCA, AAST, AUC, or business education.

2. A post IS NOT A LEAD (is_lead: false, confidence <= 0.20, intent: "NOT_A_LEAD") if it is:
   - An advertisement or promotional post from another provider.
   - Congratulating someone on graduation ("مبروك للزملاء على التخرج").
   - General news, system messages, or unrelated topics.

Return ONLY a valid JSON object in this exact format:
{
  "is_lead": boolean,
  "confidence": number (e.g. 0.95),
  "intent": "LEAD_INQUIRY" | "NOT_A_LEAD",
  "reasoning": "سبب صريح باللغة العربية بملخص قصير",
  "summary": "ملخص طلب العميل"
}`

export async function analyzeLeadWithGroq(postContent: string): Promise<LeadAnalysisResult> {
  const config = useRuntimeConfig()
  const apiKey = config.groqApiKey || process.env.GROQ_API_KEY

  if (!apiKey) {
    console.warn('[AI] GROQ_API_KEY not set, using smart local analysis')
    return smartLocalAnalysis(postContent)
  }

  const MAX_RETRIES = 3
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await $fetch<{
        choices: Array<{
          message: {
            content: string
          }
        }>
      }>('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Analyze this post:\n\n"${postContent}"` },
          ],
          temperature: 0.1,
          max_tokens: 512,
          response_format: { type: 'json_object' },
        },
      })

      const rawText = response.choices?.[0]?.message?.content
      if (!rawText) {
        throw new Error('Empty response from Groq')
      }

      // Strip markdown code fences if present
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      
      interface GroqResult {
        is_lead: boolean
        confidence?: number
        confidence_score?: number
        intent?: string
        intent_category?: string
        summary?: string
        reasoning?: string
      }
      
      const result = JSON.parse(cleaned) as GroqResult
      const isLead = Boolean(result.is_lead)
      const conf = Number(result.confidence_score ?? result.confidence) || (isLead ? 0.90 : 0.10)

      console.log(`[AI] Groq result: is_lead=${isLead}, confidence=${conf}`)

      return {
        is_lead: isLead,
        confidence_score: Math.min(1, Math.max(0, conf)),
        summary: String(result.summary || result.reasoning || postContent.slice(0, 100)),
        intent_category: result.intent_category || result.intent || (isLead ? 'LEAD_INQUIRY' : 'NOT_A_LEAD'),
      }
    }
    catch (error: unknown) {
      lastError = error
      const status = (error as { statusCode?: number })?.statusCode
                  || (error as { response?: { status?: number } })?.response?.status

      if (status === 429 && attempt < MAX_RETRIES) {
        const waitMs = attempt * 2000
        console.warn(`[AI] Rate limited (429), retrying in ${waitMs}ms (attempt ${attempt}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, waitMs))
        continue
      }

      console.error(`[AI] Groq analysis failed (attempt ${attempt}):`, error)
      break
    }
  }

  console.warn('[AI] All Groq attempts failed, falling back to smart local analysis')
  return smartLocalAnalysis(postContent)
}

// Smart Local Analysis for Instant & Accurate Fallback
function smartLocalAnalysis(content: string): LeadAnalysisResult {
  const text = content.toLowerCase()
  
  const targetTopicKeywords = [
    'mba', 'ماجستير', 'بيزنس', 'إدارة أعمال', 'ادارة اعمال', 'دبلومة', 
    'brooklyn', 'بروكليـن', 'business school', 'دراسة بيزنس'
  ]
  
  const inquiryKeywords = [
    'حد يرشحلي', 'حد يعرف', 'عايز أدرس', 'عايز ادرس', 'اروح فين', 
    'أحسن مكان', 'احسن مكان', 'مكان كويس', 'استفسار', 'ترشيح', 'ينصحني'
  ]

  const hasTopic = targetTopicKeywords.some(k => text.includes(k))
  const hasInquiry = inquiryKeywords.some(k => text.includes(k))

  if (hasTopic && hasInquiry) {
    return {
      is_lead: true,
      confidence_score: 0.95, // 95% Confidence to trigger Telegram immediately
      summary: 'استفسار صريح ومباشر عن دراسة الـ MBA والبيزنس في مصر',
      intent_category: 'LEAD_INQUIRY',
    }
  }

  // Single keyword match check
  if (hasTopic) {
    return {
      is_lead: true,
      confidence_score: 0.85,
      summary: 'منشور يذكر دراسة والـ MBA والبيزنس',
      intent_category: 'LEAD_INQUIRY',
    }
  }

  return {
    is_lead: false,
    confidence_score: 0.10,
    summary: 'منشور عام أو غير متعلق باستفسارات الـ MBA',
    intent_category: 'NOT_A_LEAD',
  }
}
