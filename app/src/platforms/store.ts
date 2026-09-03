import type { PlatformId } from './types'

const PLATFORM_STORAGE_KEY = 'wb_active_platform'

export function getActivePlatform(): PlatformId {
  try {
    const stored = localStorage.getItem(PLATFORM_STORAGE_KEY)
    if (stored === 'intigriti' || stored === 'hackerone' || stored === 'bugcrowd') return stored
  } catch {
    // localStorage unavailable
  }
  return 'intigriti'
}

export function setActivePlatform(platform: PlatformId): void {
  try {
    localStorage.setItem(PLATFORM_STORAGE_KEY, platform)
  } catch {
    // localStorage unavailable
  }
}
