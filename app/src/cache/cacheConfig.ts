import { getToken } from '../auth/store'

export type EncryptionMode = 'none' | 'apiKey' | 'custom'

interface CacheConfigState {
  folderSelected: boolean
  encryptionMode: EncryptionMode
  customKeyValidated: boolean
  encryptionKey: string | null
}

export const cacheConfig: CacheConfigState = {
  folderSelected: false,
  encryptionMode: 'none',
  customKeyValidated: false,
  encryptionKey: null,
}

export function getCacheEncryptionKey(): string | undefined {
  if (cacheConfig.encryptionMode === 'none') return undefined
  if (cacheConfig.encryptionMode === 'apiKey') return getToken() ?? undefined
  return cacheConfig.customKeyValidated ? (cacheConfig.encryptionKey ?? undefined) : undefined
}
