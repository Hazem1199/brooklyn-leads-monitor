import { queryDb } from './db'

export async function syncAllMonitorsToApify() {
  const apifyToken = process.env.APIFY_TOKEN
  const apifyTaskId = process.env.APIFY_TASK_ID

  if (!apifyToken || !apifyTaskId) {
    console.warn('[Apify Sync] Skipping task sync: APIFY_TOKEN or APIFY_TASK_ID is not configured in environment')
    return
  }

  try {
    // 1. Fetch all distinct active group URLs from public.monitors
    const rows = await queryDb<{ group_url: string }>(
      `SELECT DISTINCT group_url FROM public.monitors 
       WHERE is_active = true 
         AND group_url IS NOT NULL 
         AND group_url != ''`
    )

    if (rows.length === 0) {
      console.log('[Apify Sync] No active monitors to sync to Apify task')
      return
    }

    const startUrls = rows.map(r => ({ url: r.group_url }))

    // 2. Update the Apify Actor Task input
    const taskInputUrl = `https://api.apify.com/v2/actor-tasks/${apifyTaskId}/input?token=${apifyToken}`
    
    await $fetch(taskInputUrl, {
      method: 'PUT',
      body: {
        startUrls,
        resultsLimit: 10,
        viewOption: 'CHRONOLOGICAL',
      },
    })

    console.log(`[Apify Sync] Successfully synchronized ${startUrls.length} group URLs to Apify task ${apifyTaskId}`)
  } catch (err: any) {
    console.error('[Apify Sync Error] Failed to update Apify actor task:', err.message || err)
  }
}
