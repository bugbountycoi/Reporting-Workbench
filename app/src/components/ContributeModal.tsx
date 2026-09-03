import { useState } from 'react'
import type { UserModuleSpec } from '../reports/userModules/types'
import type { ThemeSpec } from '../themes/types'

type ContributeType = 'module' | 'theme'
type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

interface Props {
  type: ContributeType
  name: string
  payload: UserModuleSpec | ThemeSpec
  onClose: () => void
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
}

// Returns the bare username if the string looks like a valid GitHub username
// (with or without a leading @). Returns null for free-form names.
function parseGitHubUsername(raw: string): string | null {
  const stripped = raw.startsWith('@') ? raw.slice(1) : raw
  // GitHub: 1-39 chars, alphanumeric + hyphens, no leading/trailing hyphen, no consecutive hyphens
  if (
    stripped.length >= 1 &&
    stripped.length <= 39 &&
    /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(stripped) &&
    !stripped.includes('--')
  ) {
    return stripped
  }
  // Single alphanumeric char also valid
  if (/^[a-zA-Z0-9]$/.test(stripped)) return stripped
  return null
}

export function ContributeModal({ type, name, payload, onClose }: Props) {
  const [author, setAuthor] = useState('')
  const [authorNote, setAuthorNote] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [prUrl, setPrUrl] = useState('')
  const [prNumber, setPrNumber] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const label = type === 'module' ? 'Report Module' : 'Theme'
  const slug = toSlug(name)

  const authorTrimmed = author.trim()
  const githubUsername = authorTrimmed ? parseGitHubUsername(authorTrimmed) : null
  const isFreeFormName = authorTrimmed && !githubUsername

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitState('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          slug,
          author: authorTrimmed || undefined,
          authorNote: authorNote.trim() || undefined,
          payload,
        }),
      })
      const data = await res.json() as { prUrl?: string; prNumber?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)
      setPrUrl(data.prUrl ?? '')
      setPrNumber(data.prNumber ?? null)
      setSubmitState('success')
    } catch (err) {
      setErrorMsg(String(err))
      setSubmitState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900 text-base">
            Contribute {label}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">✕</button>
        </div>

        {submitState === 'success' ? (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="text-4xl">🎉</div>
            <p className="font-medium text-gray-900">PR #{prNumber} opened!</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your {label.toLowerCase()} has been submitted for review. A maintainer will look it over before merging.
            </p>
            {prUrl && (
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-semibold text-brand-blue hover:underline"
              >
                View pull request →
              </a>
            )}
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
              Your {label.toLowerCase()} will be submitted as a <strong>public pull request</strong> on GitHub.
              It will be visible to anyone until merged or closed. Do not include personal data or API credentials.
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Submitting</label>
              <p className="text-sm font-medium text-gray-900">{name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Will be saved as <code className="bg-gray-100 px-1 rounded">community/{type}s/{slug}.json</code>
              </p>
            </div>

            <div>
              <label htmlFor="author" className="block text-xs font-semibold text-gray-600 mb-1">
                Author credit <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value.slice(0, 100))}
                placeholder="@github-username or Your Name"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
              {/* Live preview */}
              {githubUsername && (
                <p className="mt-1 text-xs text-gray-500">
                  Will be credited as{' '}
                  <a
                    href={`https://github.com/${githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-blue hover:underline font-medium"
                  >
                    @{githubUsername}
                  </a>
                  {' '}on GitHub
                </p>
              )}
              {isFreeFormName && (
                <p className="mt-1 text-xs text-gray-500">
                  Will be credited as <span className="font-medium text-gray-700">{authorTrimmed}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="authorNote" className="block text-xs font-semibold text-gray-600 mb-1">
                Note for maintainers <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="authorNote"
                value={authorNote}
                onChange={(e) => setAuthorNote(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="What does this do? Any usage tips or context?"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
              />
            </div>

            {submitState === 'error' && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitState === 'submitting'}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitState === 'submitting'}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--brand-navy)' }}
              >
                {submitState === 'submitting' ? 'Opening PR…' : 'Submit contribution'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
