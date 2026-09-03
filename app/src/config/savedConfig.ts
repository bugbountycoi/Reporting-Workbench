const CONFIG_KEY = 'wb-config'

export interface SavedModuleParams {
  programIndices: number[]
  viewMode?: 'compare' | 'combine'
  startDate?: string
  endDate?: string
  [key: string]: unknown
}

export interface SavedSettings {
  encryptionMode: 'none' | 'apiKey' | 'custom'
  panelsOpen: { api: boolean; cache: boolean; encryption: boolean }
}

export interface SavedConfig {
  version: number
  settings?: SavedSettings
  moduleParams: Record<string, SavedModuleParams>
  savedAt: string
}

export function saveWorkbenchConfig(config: SavedConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

export function loadWorkbenchConfig(): SavedConfig | null {
  const raw = localStorage.getItem(CONFIG_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SavedConfig
    if (parsed.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function clearWorkbenchConfig(): void {
  localStorage.removeItem(CONFIG_KEY)
}
