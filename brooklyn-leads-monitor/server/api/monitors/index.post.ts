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
        false // Default to false (pending verification)
      ]
    )

    const monitor = rows[0]

    // Run the Apify workflows in the background to update sync_status and is_active without blocking the response
    const runApifyWorkflow = async () => {
      const apifyToken = process.env.APIFY_TOKEN
      let scraperSuccess = true
      let taskSyncSuccess = true

      // 1. Trigger immediate run
      if (apifyToken && monitor.group_url) {
        try {
          await $fetch(`https://api.apify.com/v2/acts/apify~facebook-groups-scraper/runs?token=${apifyToken}`, {
            method: 'POST',
            body: {
              startUrls: [{ url: monitor.group_url }],
              resultsLimit: 5,
              viewOption: "CHRONOLOGICAL"
            }
          })
          console.log(`[Apify Sync] Successfully triggered scraper run for ${monitor.group_url}`)
        } catch (err: any) {
          console.error('[Apify Sync Error] Failed to trigger Apify run:', err.message || err)
          scraperSuccess = false
        }
      }

      // 2. Synchronize all monitors to Apify Task
      try {
        await syncAllMonitorsToApify()
      } catch (err: any) {
        console.error('[Apify Sync Error] Failed to run syncAllMonitorsToApify:', err.message || err)
        taskSyncSuccess = false
      }

      // 3. Update database status and is_active
      const finalStatus = (scraperSuccess && taskSyncSuccess) ? 'synced' : 'error'
      const isActive = (scraperSuccess && taskSyncSuccess) // Sets is_active to true only if both succeed
      
      await queryDb(
        "UPDATE public.monitors SET sync_status = $1, is_active = $2 WHERE id = $3", 
        [finalStatus, isActive, monitor.id]
      )
      console.log(`[Apify Sync] Monitor ${monitor.id} status updated to: ${finalStatus}, is_active: ${isActive}`)
    }

    runApifyWorkflow().catch((err) => {
      console.error('[Apify Sync Workflow Error] Uncaught background error:', err)
    })

    return {
      success: true,
      data: monitor
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: err.message })
  }
})
