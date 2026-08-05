// server/utils/ai.ts
// Google Gemini API integration for lead intent classification

export interface LeadAnalysisResult {
  is_lead: boolean
  confidence_score: number
  summary: string
  intent_category: string
}

const SYSTEM_PROMPT = `You are an expert lead classification AI for Brooklyn Business School (BBS) in Egypt.
Your task is to analyze social media posts and determine if the author is a prospective student interested in:
- MBA programs
- Master's degrees in Business Administration
- Executive education or business courses
- Higher education in Cairo/Egypt

RULES:
1. Only classify as a lead if the person is ACTIVELY inquiring, expressing interest, or seeking recommendations about MBA/Master's programs.
2. General business discussions, news sharing, congratulations posts, and off-topic content are NOT leads.
3. Support Arabic and English text.
4. Return ONLY valid JSON, no markdown, no explanation.

Respond with this exact JSON structure:
{
  "is_lead": boolean,
  "confidence_score": number between 0.0 and 1.0,
  "summary": "one sentence English summary of the post",
  "intent_category": "SEEKING_MBA" | "SEEKING_MASTERS" | "SEEKING_COURSES" | "SEEKING_INFO" | "NOT_A_LEAD"
}`

export async function analyzeLeadWithGroq(postContent: string): Promise<LeadAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.warn('[AI] GEMINI_API_KEY not set, using mock analysis')
    return mockAnalysis(postContent)
  }

  const MAX_RETRIES = 3
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const prompt = `${SYSTEM_PROMPT}\n\nAnalyze this post:\n\n"${postContent}"`

      const response = await $fetch<{
        candidates: Array<{
          content: {
            parts: Array<{ text: string }>
          }
        }>
      }>(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
            responseMimeType: 'application/json',
          },
        },
      })

      const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawText) {
        throw new Error('Empty response from Gemini')
      }

      // Strip markdown code fences if present
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const result = JSON.parse(cleaned) as LeadAnalysisResult

      return {
        is_lead: Boolean(result.is_lead),
        confidence_score: Math.min(1, Math.max(0, Number(result.confidence_score) || 0)),
        summary: String(result.summary || 'No summary'),
        intent_category: result.intent_category || 'NOT_A_LEAD',
      }
    }
    catch (error: unknown) {
      lastError = error
      const status = (error as { statusCode?: number })?.statusCode
                  || (error as { response?: { status?: number } })?.response?.status

      if (status === 429 && attempt < MAX_RETRIES) {
        const waitMs = attempt * 2000 // 2s, 4s
        console.warn(`[AI] Rate limited (429), retrying in ${waitMs}ms (attempt ${attempt}/${MAX_RETRIES})`)
        await new Promise(resolve => setTimeout(resolve, waitMs))
        continue
      }

      console.error(`[AI] Gemini analysis failed (attempt ${attempt}):`, error)
      break
    }
  }

  console.warn('[AI] All Gemini attempts failed, falling back to mock analysis')
  return mockAnalysis(postContent)
}

// Fallback mock analysis when API key is not set
function mockAnalysis(content: string): LeadAnalysisResult {
  const leadKeywords = [
    'mba', 'ماجستير', 'ماجستر', 'master', 'درجة', 'دراسة', 'جامعة',
    'تعليم', 'دبلوم', 'بكالوريوس', 'دكتوراه', 'برنامج', 'كورس',
    'business school', 'إدارة أعمال', 'يرشحلي', 'ينصحني', 'recommend',
  ]
  const lower = content.toLowerCase()
  const matchCount = leadKeywords.filter(k => lower.includes(k)).length
  const isLead = matchCount >= 2
  const score = Math.min(0.95, matchCount * 0.15)

  return {
    is_lead: isLead,
    confidence_score: score,
    summary: isLead ? 'Prospective student inquiring about business education' : 'General post, not a lead',
    intent_category: isLead ? 'SEEKING_MBA' : 'NOT_A_LEAD',
  }
}
