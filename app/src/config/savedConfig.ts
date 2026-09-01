const CONFIG_KEY = 'inti-rw-config'

export interface SavedModuleParams {
  programIndices: number[]
  viewMode?: 'compare' | 'combine'
  startDate?: string
  endDate?: string
  [key: string]: unknown
}

export interface SavedConfig {
  version: number
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
