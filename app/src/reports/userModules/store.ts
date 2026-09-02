import type { UserModuleSpec } from './types'
import { isUserModuleSpec } from './types'

const STORAGE_KEY = 'inti_user_modules'

export function loadUserModuleSpecs(): UserModuleSpec[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isUserModuleSpec)
  } catch {
    return []
  }
}

function save(specs: UserModuleSpec[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(specs))
}

export function saveUserModuleSpecs(specs: UserModuleSpec[]) {
  save(specs)
}

export function addUserModuleSpec(spec: UserModuleSpec) {
  const existing = loadUserModuleSpecs().filter((s) => s.id !== spec.id)
  save([...existing, spec])
}

export function replaceUserModuleSpec(spec: UserModuleSpec) {
  const existing = loadUserModuleSpecs()
  const idx = existing.findIndex((s) => s.id === spec.id)
  if (idx === -1) {
    save([...existing, spec])
  } else {
    existing[idx] = spec
    save(existing)
  }
}

export function deleteUserModuleSpec(id: string) {
  save(loadUserModuleSpecs().filter((s) => s.id !== id))
}

export function userModuleSpecExists(id: string): boolean {
  return loadUserModuleSpecs().some((s) => s.id === id)
}

// Bumps the patch version: "1.0.3" → "1.0.4"
export function bumpVersion(version: string): string {
  const parts = version.split('.')
  if (parts.length !== 3) return version
  const patch = parseInt(parts[2] ?? '0', 10)
  return `${parts[0]}.${parts[1]}.${patch + 1}`
}
