import type { ThemeSpec } from './types'
import { isThemeSpec } from './types'
import { communityTheme } from './builtins/community'

const ACTIVE_KEY = 'wb_active_theme'
const USER_THEMES_KEY = 'wb_user_themes'

export const BUILTIN_THEMES: ThemeSpec[] = [communityTheme]
export const BUILTIN_IDS = new Set(BUILTIN_THEMES.map((t) => t.id))

export function loadUserThemes(): ThemeSpec[] {
  try {
    const raw = localStorage.getItem(USER_THEMES_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as unknown[]).filter(isThemeSpec)
  } catch {
    return []
  }
}

export function saveUserThemes(themes: ThemeSpec[]): void {
  localStorage.setItem(USER_THEMES_KEY, JSON.stringify(themes))
}

export function addUserTheme(spec: ThemeSpec): void {
  const existing = loadUserThemes().filter((t) => t.id !== spec.id)
  saveUserThemes([...existing, spec])
}

export function deleteUserTheme(id: string): void {
  saveUserThemes(loadUserThemes().filter((t) => t.id !== id))
}

export function getAllThemes(): ThemeSpec[] {
  return [...BUILTIN_THEMES, ...loadUserThemes()]
}

export function getActiveThemeId(): string {
  return localStorage.getItem(ACTIVE_KEY) ?? 'community'
}

export function setActiveThemeId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function resolveTheme(id: string): ThemeSpec {
  return getAllThemes().find((t) => t.id === id) ?? communityTheme
}
