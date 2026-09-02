import { isThemeSpec, type ThemeSpec } from './types'
import { addUserTheme, BUILTIN_IDS } from './store'

export class ThemeLoadError extends Error {}

export async function installThemeFromJson(json: unknown): Promise<ThemeSpec> {
  if (!isThemeSpec(json)) {
    throw new ThemeLoadError('File does not contain a valid theme package. Expected a ThemeSpec object with id, name, colors, and fonts fields.')
  }
  if (BUILTIN_IDS.has(json.id)) {
    throw new ThemeLoadError(`"${json.id}" is a built-in theme and cannot be overwritten. Change the theme's id field before installing.`)
  }
  addUserTheme(json)
  return json
}

export async function installThemeFromUrl(url: string): Promise<ThemeSpec> {
  try {
    if (new URL(url).protocol !== 'https:') throw new ThemeLoadError('Only https:// URLs are permitted.')
  } catch (e) {
    throw e instanceof ThemeLoadError ? e : new ThemeLoadError(`Invalid URL: ${url}`)
  }
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  } catch (err) {
    const msg = String(err).includes('NetworkError') || String(err).includes('Failed to fetch')
      ? `Network error fetching ${url}. If the server does not allow cross-origin requests, download the file and use "Install from file" instead.`
      : String(err)
    throw new ThemeLoadError(msg)
  }
  if (!response.ok) {
    throw new ThemeLoadError(`HTTP ${response.status} fetching ${url}`)
  }
  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new ThemeLoadError('Response was not valid JSON.')
  }
  return installThemeFromJson(json)
}
