import { useSupabaseServer } from './supabase'

export interface SystemSettings {
  skipDuplicates: boolean
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const supabase = useSupabaseServer()
    const { data, error } = await supabase
      .from('leads')
      .select('summary')
      .eq('group_name', '__SYSTEM_SETTINGS__')
      .limit(1)

    if (error || !data || data.length === 0) {
      return {
        skipDuplicates: false,
      }
    }

    return JSON.parse(data[0].summary) as SystemSettings
  } catch (e) {
    return {
      skipDuplicates: false,
    }
  }
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  const supabase = useSupabaseServer()
  
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('group_name', '__SYSTEM_SETTINGS__')
    .limit(1)

  if (error) {
    console.error('[Settings] Error checking settings existence:', error.message)
  }

  if (data && data.length > 0) {
    // Update existing settings row
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        summary: JSON.stringify(settings),
        post_content: 'System settings record. Do not delete.',
      })
      .eq('group_name', '__SYSTEM_SETTINGS__')

    if (updateError) {
      throw new Error(`Failed to update system settings: ${updateError.message}`)
    }
  } else {
    // Insert new settings row
    const { error: insertError } = await supabase
      .from('leads')
      .insert({
        group_name: '__SYSTEM_SETTINGS__',
        post_content: 'System settings record. Do not delete.',
        summary: JSON.stringify(settings),
        is_lead: false,
        confidence_score: 0,
      })

    if (insertError) {
      throw new Error(`Failed to insert system settings: ${insertError.message}`)
    }
  }
}
