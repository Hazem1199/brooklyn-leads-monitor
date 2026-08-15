import { queryDb } from '../../utils/db'
import { getAuthUser } from '../../utils/auth'
import { syncAllMonitorsToApify } from '../../utils/apify'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  const body = await readBody<{
    group_name: string
    group_url?: string
    niche_description?: string
    keywords?: string
  }>(event)

  if (!body?.group_name) {
    throw createError({ statusCode: 400, message: 'Missing group_name' })
  }

  try {
    const rows = await queryDb(
      `INSERT INTO public.monitors (user_id, group_name, group_url, niche_description, keywords, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        user.id,
        body.group_name.trim(),
        body.group_url?.trim() || null,
        body.niche_description?.trim() || null,
        body.keywords?.trim() || null,
        true
      ]
    )

    const monitor = rows[0]

    // Trigger immediate Apify Facebook Groups Scraper run in the background
    const apifyToken = process.env.APIFY_TOKEN
    if (apifyToken && monitor.group_url) {
      $fetch(`https://api.apify.com/v2/acts/apify~facebook-groups-scraper/runs?token=${apifyToken}`, {
        method: 'POST',
        body: {
          startUrls: [{ url: monitor.group_url }],
          resultsLimit: 5,
          viewOption: "CHRONOLOGICAL"
        }
      }).then(() => {
        console.log(`[Apify Sync] Successfully triggered scraper run for ${monitor.group_url}`)
      }).catch((err: any) => {
        console.error('[Apify Sync Error] Failed to trigger Apify run:', err.message || err)
      })
    }

    // Synchronize all user monitors to Apify Actor Task in the background
    syncAllMonitorsToApify().then(() => {
      console.log('[Apify Sync] Task synchronization completed')
    }).catch((err: any) => {
      console.error('[Apify Sync Error] Failed to run syncAllMonitorsToApify:', err.message || err)
    })

    return {
      success: true,
      data: monitor
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message })
  }
})
