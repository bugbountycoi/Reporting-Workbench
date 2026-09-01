import { useState } from 'react'
import { requestCacheFolder } from '../cache/manager'
import { testPassphrase } from '../cache/encryption'
import { getToken } from '../auth/store'

export type EncryptionMode = 'none' | 'apiKey' | 'custom'

interface CacheState {
  folderSelected: boolean
  encryptionMode: EncryptionMode
  customKey: string
  customKeyValidated: boolean
  encryptionKey: string | null
}

let _cacheState: CacheState = {
  folderSelected: false,
  encryptionMode: 'none',
  customKey: '',
  customKeyValidated: false,
  encryptionKey: null,
}

export function getCacheEncryptionKey(): string | undefined {
  if (_cacheState.encryptionMode === 'none') return undefined
  if (_cacheState.encryptionMode === 'apiKey') return getToken() ?? undefined
  return _cacheState.customKeyValidated ? _cacheState.encryptionKey ?? undefined : undefined
}

export function CacheSettingsPanel() {
  const [folderSelected, setFolderSelected] = useState(_cacheState.folderSelected)
  const [encryptionMode, setEncryptionMode] = useState<EncryptionMode>(_cacheState.encryptionMode)
  const [customKey, setCustomKey] = useState('')
  const [customKeyValidated, setCustomKeyValidated] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const handleSelectFolder = async () => {
    try {
      await requestCacheFolder()
      _cacheState.folderSelected = true
      setFolderSelected(true)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.warn('Folder selection cancelled or failed:', (e as Error).message)
      }
    }
  }

  const handleTestKey = async () => {
    if (!customKey.trim()) return
    setTestingKey(true)
    setKeyError(null)
    const ok = await testPassphrase(customKey.trim())
    setTestingKey(false)
    if (ok) {
      _cacheState.customKeyValidated = true
      _cacheState.encryptionKey = customKey.trim()
      setCustomKeyValidated(true)
      setCustomKey('')
    } else {
      setKeyError('Key test failed. Please try again.')
    }
  }

  const handleEncryptionModeChange = (mode: EncryptionMode) => {
    setEncryptionMode(mode)
    _cacheState.encryptionMode = mode
    setCustomKeyValidated(false)
    _cacheState.customKeyValidated = false
    _cacheState.encryptionKey = null
    setKeyError(null)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-brand-near-white"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="font-heading font-medium text-gray-800 text-sm">Cache & Encryption</span>
          {folderSelected && <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Folder selected</span>}
          {encryptionMode !== 'none' && <span className="text-xs text-brand-blue bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">Encrypted</span>}
        </div>
        <svg className={`w-4 h-4 text-brand-gray-mid transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Cache files may contain sensitive vulnerability and program data. Store them securely and do not share without review.
          </div>

          {/* Folder selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cache Folder</label>
            <button
              onClick={handleSelectFolder}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-brand-near-white transition-colors"
            >
              {folderSelected ? '✓ Folder selected — change folder' : 'Select cache folder…'}
            </button>
            {!folderSelected && (
              <p className="text-xs text-brand-gray-mid mt-1">Optional. If selected, fetched data will be saved automatically.</p>
            )}
          </div>

          {/* Encryption */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Encryption</label>
            <div className="flex gap-2 flex-wrap">
              {([
                ['none', 'None'],
                ['apiKey', 'Use API token as key'],
                ['custom', 'Custom encryption key'],
              ] as [EncryptionMode, string][]).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => handleEncryptionModeChange(mode)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
                    encryptionMode === mode
                      ? 'bg-brand-navy text-white border-brand-navy'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-brand-near-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {encryptionMode === 'apiKey' && (
              <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                Your API token will be used as the encryption key. Anyone with your token can decrypt your cache files.
              </p>
            )}

            {encryptionMode === 'custom' && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-brand-gray-mid">Enter a strong passphrase. This is NOT your API key. Without this passphrase, cache files cannot be decrypted.</p>
                {!customKeyValidated ? (
                  <>
                    <input
                      type="password"
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="Enter encryption passphrase"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                    <button
                      onClick={handleTestKey}
                      disabled={testingKey || !customKey.trim()}
                      className="px-3 py-1.5 bg-brand-navy text-white rounded-md text-xs font-semibold disabled:opacity-50"
                    >
                      {testingKey ? 'Testing…' : 'Test & Set Key'}
                    </button>
                    {keyError && <p className="text-xs text-brand-red">{keyError}</p>}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Encryption key set
                    <button onClick={() => { setCustomKeyValidated(false); _cacheState.customKeyValidated = false }} className="text-xs text-brand-gray-mid hover:text-gray-600 underline ml-2">Change</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
