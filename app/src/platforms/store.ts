import type { PlatformId } from './registry'

const PLATFORM_KEY = 'wb_active_platform'

let _activePlatform: PlatformId =
  (localStorage.getItem(PLATFORM_KEY) as PlatformId | null) ?? 'intigriti'

export function getActivePlatform(): PlatformId {
  return _activePlatform
}

export function setActivePlatform(id: PlatformId): void {
  _activePlatform = id
  localStorage.setItem(PLATFORM_KEY, id)
}
