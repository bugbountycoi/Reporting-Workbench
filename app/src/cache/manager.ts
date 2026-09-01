import { encrypt, decrypt } from './encryption'

export interface CacheFileEntry {
  filename: string
  scope: string
  endpoint: string
  fetchedAt: string
  encrypted: boolean
  sizeBytes: number
}

function buildFilename(scope: string, endpoint: string, encrypted: boolean): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z'
  const ext = encrypted ? 'enc' : 'json'
  const safePart = (s: string) => s.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)
  return `intigriti-cache__${safePart(scope)}__${safePart(endpoint)}__${ts}.${ext}`
}

function parseFilename(filename: string): Omit<CacheFileEntry, 'sizeBytes'> | null {
  const match = filename.match(/^intigriti-cache__(.+)__(.+)__(\d{4}-\d{2}-\d{2}T[\d-]+Z)\.(json|enc)$/)
  if (!match) return null
  return {
    filename,
    scope: match[1],
    endpoint: match[2],
    fetchedAt: match[3].replace(/-(\d{2})-(\d{2})Z$/, ':$1:$2Z'),
    encrypted: match[4] === 'enc',
  }
}

let _folderHandle: FileSystemDirectoryHandle | null = null

export function hasCacheFolder(): boolean {
  return _folderHandle !== null
}

export async function requestCacheFolder(): Promise<FileSystemDirectoryHandle> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('File System Access API is not supported in this browser.')
  }
  _folderHandle = await (window as unknown as { showDirectoryPicker(): Promise<FileSystemDirectoryHandle> }).showDirectoryPicker()
  return _folderHandle
}

export function setCacheFolder(handle: FileSystemDirectoryHandle): void {
  _folderHandle = handle
}

export async function saveDataChunk(
  scope: string,
  endpoint: string,
  data: unknown,
  passphrase?: string,
): Promise<string> {
  if (!_folderHandle) throw new Error('No cache folder selected.')

  const json = JSON.stringify(data, null, 2)
  const encrypted = Boolean(passphrase)
  const content = passphrase ? await encrypt(json, passphrase) : json
  const filename = buildFilename(scope, endpoint, encrypted)

  const fileHandle = await _folderHandle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()

  return filename
}

export async function loadCacheIndex(): Promise<CacheFileEntry[]> {
  if (!_folderHandle) throw new Error('No cache folder selected.')

  const entries: CacheFileEntry[] = []
  for await (const [name, handle] of _folderHandle as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (handle.kind !== 'file') continue
    const meta = parseFilename(name)
    if (!meta) continue
    const file = await (handle as FileSystemFileHandle).getFile()
    entries.push({ ...meta, sizeBytes: file.size })
  }

  return entries.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))
}

export async function loadCacheFile(filename: string, passphrase?: string): Promise<unknown> {
  if (!_folderHandle) throw new Error('No cache folder selected.')

  const fileHandle = await _folderHandle.getFileHandle(filename)
  const file = await fileHandle.getFile()
  const text = await file.text()

  const meta = parseFilename(filename)
  if (!meta) throw new Error('Invalid cache filename format.')

  if (meta.encrypted) {
    if (!passphrase) throw new Error('Encryption key required to decrypt this file.')
    const decrypted = await decrypt(text, passphrase)
    return JSON.parse(decrypted) as unknown
  }

  return JSON.parse(text) as unknown
}
