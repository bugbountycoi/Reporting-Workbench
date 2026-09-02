import { isUserModuleSpec, type UserModuleSpec } from './types'

export class ModuleLoadError extends Error {}

export async function importModuleFromUrl(url: string): Promise<UserModuleSpec[]> {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  } catch (err) {
    const msg =
      String(err).includes('NetworkError') || String(err).includes('Failed to fetch')
        ? `Network error fetching ${url}. If the server does not allow cross-origin requests, download the file and use the file importer instead.`
        : String(err)
    throw new ModuleLoadError(msg)
  }
  if (!response.ok) {
    throw new ModuleLoadError(`HTTP ${response.status} fetching ${url}`)
  }
  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new ModuleLoadError('Response was not valid JSON.')
  }
  const items = Array.isArray(json) ? json : [json]
  const valid: UserModuleSpec[] = []
  for (const item of items) {
    if (!isUserModuleSpec(item)) {
      throw new ModuleLoadError('Response does not contain a valid module spec.')
    }
    valid.push(item as UserModuleSpec)
  }
  if (valid.length === 0) {
    throw new ModuleLoadError('No valid module specs found in response.')
  }
  return valid
}
