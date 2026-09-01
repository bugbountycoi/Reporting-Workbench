import { useState } from 'react'
import { testPassphrase } from '../cache/encryption'
import { cacheConfig, type EncryptionMode } from '../cache/cacheConfig'

interface Props {
  onConfigured: (mode?: EncryptionMode) => void
  onClose: () => void
}

export function EncryptionPanel({ onConfigured, onClose }: Props) {
  const [encryptionMode, setEncryptionMode] = useState<EncryptionMode>(cacheConfig.encryptionMode)
  const [customKey, setCustomKey] = useState('')
  const [customKeyValidated, setCustomKeyValidated] = useState(cacheConfig.customKeyValidated)
  const [testingKey, setTestingKey] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  const handleModeChange = (mode: EncryptionMode) => {
    setEncryptionMode(mode)
    cacheConfig.encryptionMode = mode
    setCustomKeyValidated(false)
    cacheConfig.customKeyValidated = false
    cacheConfig.encryptionKey = null
    setKeyError(null)
    if (mode !== 'custom') {
      onConfigured(mode)
    }
  }

  const handleTestKey = async () => {
    if (!customKey.trim()) return
    setTestingKey(true)
    setKeyError(null)
    const ok = await testPassphrase(customKey.trim())
    setTestingKey(false)
    if (ok) {
      cacheConfig.customKeyValidated = true
      cacheConfig.encryptionKey = customKey.trim()
      setCustomKeyValidated(true)
      setCustomKey('')
      onConfigured('custom')
    } else {
      setKeyError('Key test failed — please try again.')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-gray-900 text-sm">Encryption</h2>
        <button
          onClick={onClose}
          title="Dismiss panel"
          className="text-brand-gray-mid hover:text-gray-700 transition-colors p-1 -mr-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-brand-gray-mid leading-relaxed">
        Encrypt cache files so sensitive data is protected at rest.
      </p>

      <div className="flex gap-2 flex-wrap">
        {([
          ['none', 'None'],
          ['apiKey', 'Use API token'],
          ['custom', 'Custom passphrase'],
        ] as [EncryptionMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
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

      {encryptionMode === 'none' && (
        <p className="text-xs text-brand-gray-mid">
          Cache files will be stored unencrypted. Only enable on trusted devices.
        </p>
      )}

      {encryptionMode === 'apiKey' && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
          Your API token will be used as the encryption key. Anyone with your token can read your cache files.
        </p>
      )}

      {encryptionMode === 'custom' && (
        <div className="space-y-2">
          <p className="text-xs text-brand-gray-mid">
            Enter a strong passphrase. Without it, cache files cannot be decrypted.
          </p>
          {!customKeyValidated ? (
            <>
              <input
                type="password"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestKey()}
                placeholder="Enter encryption passphrase"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              <button
                onClick={handleTestKey}
                disabled={testingKey || !customKey.trim()}
                className="px-3 py-1.5 bg-brand-navy text-white rounded-md text-xs font-semibold disabled:opacity-50 hover:bg-brand-navy-light transition-colors"
              >
                {testingKey ? 'Testing…' : 'Set Key'}
              </button>
              {keyError && <p className="text-xs text-brand-red">{keyError}</p>}
            </>
          ) : (
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Encryption key set
              <button
                onClick={() => {
                  setCustomKeyValidated(false)
                  cacheConfig.customKeyValidated = false
                }}
                className="text-xs text-brand-gray-mid hover:text-gray-600 underline ml-2"
              >
                Change
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
