import { promises as fs } from 'fs'
import { join } from 'path'

const settingsDir = join(process.cwd(), 'server/data')
const settingsFile = join(settingsDir, 'settings.json')

export interface SystemSettings {
  skipDuplicates: boolean
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    await fs.mkdir(settingsDir, { recursive: true })
    const data = await fs.readFile(settingsFile, 'utf-8')
    return JSON.parse(data) as SystemSettings
  } catch (e) {
    // Default system settings
    return {
      skipDuplicates: false,
    }
  }
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  await fs.mkdir(settingsDir, { recursive: true })
  await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf-8')
}
