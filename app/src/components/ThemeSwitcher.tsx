import { useRef, useState } from 'react'
import { useTheme } from '../themes/ThemeProvider'
import { ThemeLoadError } from '../themes/loader'
import type { ThemeSpec } from '../themes/types'
import { ThemeEditor } from './ThemeEditor'

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 3a9 9 0 100 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16a5 5 0 005-5c0-4.42-4.03-8-9-8z" />
      <circle cx="6.5"  cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5"  cy="7.5"  r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7.5"  r="1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ThemeSwatch({ spec }: { spec: ThemeSpec }) {
  return (
    <span className="flex gap-0.5 shrink-0">
      <span className="w-3 h-3 rounded-sm" style={{ background: spec.colors.navy }} />
      <span className="w-3 h-3 rounded-sm" style={{ background: spec.colors.blue }} />
      <span className="w-3 h-3 rounded-sm" style={{ background: spec.colors.orange }} />
    </span>
  )
}

export function ThemeSwitcher() {
  const { activeTheme, allThemes, builtinIds, setActiveTheme, installFromJson, installFromUrl, uninstallTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [urlInputOpen, setUrlInputOpen] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editorTheme, setEditorTheme] = useState<ThemeSpec | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const openEditor = (theme: ThemeSpec) => {
    setOpen(false)
    setEditorTheme(theme)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const json = JSON.parse(await file.text())
      const spec = await installFromJson(json)
      setActiveTheme(spec)
      setOpen(false)
    } catch (err) {
      setError(err instanceof ThemeLoadError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleUrlInstall() {
    if (!urlValue.trim()) return
    setError(null)
    setBusy(true)
    try {
      const spec = await installFromUrl(urlValue.trim())
      setActiveTheme(spec)
      setUrlInputOpen(false)
      setUrlValue('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof ThemeLoadError ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); setError(null) }}
        title="Switch theme"
        className={`p-1.5 rounded-md transition-colors ${open ? 'bg-white/15' : 'hover:bg-white/10'}`}
        aria-label="Open theme switcher"
      >
        <PaletteIcon className="w-4 h-4 text-white/80 hover:text-white" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Theme</p>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
            {allThemes.map((spec) => (
              <div key={spec.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 group">
                <button
                  onClick={() => { setActiveTheme(spec); setOpen(false) }}
                  className="flex items-center gap-3 flex-1 text-left min-w-0"
                >
                  <ThemeSwatch spec={spec} />
                  <span className="text-sm font-medium text-gray-800 truncate">{spec.name}</span>
                  {activeTheme.id === spec.id && (
                    <span className="ml-auto text-brand-blue shrink-0">✓</span>
                  )}
                </button>
                <button
                  onClick={() => openEditor(spec)}
                  className="hidden group-hover:block text-xs text-gray-400 hover:text-brand-blue shrink-0 transition-colors px-1"
                  title={builtinIds.has(spec.id) ? 'Fork & edit this theme' : 'Edit theme'}
                  aria-label={`Edit theme ${spec.name}`}
                >
                  Edit
                </button>
                {!builtinIds.has(spec.id) && (
                  <button
                    onClick={() => {
                      if (confirm(`Remove theme "${spec.name}"?`)) {
                        uninstallTheme(spec.id)
                        if (activeTheme.id === spec.id) setActiveTheme(allThemes[0])
                      }
                    }}
                    className="hidden group-hover:block text-gray-300 hover:text-red-500 shrink-0 transition-colors text-xs px-1"
                    title="Remove theme"
                    aria-label={`Remove theme ${spec.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 px-4 py-3 space-y-2">
            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded p-2 leading-snug">{error}</p>
            )}

            <button
              onClick={() => openEditor(activeTheme)}
              disabled={busy}
              className="w-full text-xs font-semibold text-brand-blue hover:text-brand-blue-dark border border-brand-blue/30 hover:border-brand-blue rounded-md px-3 py-1.5 transition-colors"
            >
              Create theme from current →
            </button>

            {urlInputOpen ? (
              <div className="space-y-1.5">
                <input
                  type="url"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlInstall()}
                  placeholder="https://example.com/theme.json"
                  className="w-full text-xs border border-gray-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUrlInstall}
                    disabled={busy || !urlValue.trim()}
                    className="flex-1 text-xs font-semibold bg-brand-navy text-white rounded-md px-3 py-1.5 hover:bg-brand-navy-light disabled:opacity-40 transition-colors"
                  >
                    {busy ? 'Installing…' : 'Install'}
                  </button>
                  <button
                    onClick={() => { setUrlInputOpen(false); setError(null) }}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="flex-1 text-xs font-semibold text-gray-600 hover:text-brand-navy border border-gray-200 hover:border-brand-blue rounded-md px-3 py-1.5 transition-colors"
                >
                  Install from file
                </button>
                <button
                  onClick={() => { setUrlInputOpen(true); setError(null) }}
                  disabled={busy}
                  className="flex-1 text-xs font-semibold text-gray-600 hover:text-brand-navy border border-gray-200 hover:border-brand-blue rounded-md px-3 py-1.5 transition-colors"
                >
                  Install from URL
                </button>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
        </div>
      )}

      {editorTheme && (
        <ThemeEditor
          initialTheme={editorTheme}
          onClose={() => setEditorTheme(null)}
        />
      )}
    </div>
  )
}
