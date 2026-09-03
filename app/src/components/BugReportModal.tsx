import { useState } from 'react'

export interface BugReportContext {
  appVersion: string
  mode: 'mock' | 'cache' | 'live'
  connected: boolean
  activeReport: string | null
}

interface Props {
  context: BugReportContext
  onClose: () => void
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

function getBrowserInfo(): string {
  const ua = navigator.userAgent
  const edge = ua.match(/Edg\/(\d+)/)
  if (edge) return `Edge ${edge[1]}`
  const chrome = ua.match(/Chrome\/(\d+)/)
  if (chrome) return `Chrome ${chrome[1]}`
  const ff = ua.match(/Firefox\/(\d+)/)
  if (ff) return `Firefox ${ff[1]}`
  const safari = ua.match(/Version\/(\d+).*Safari/)
  if (safari) return `Safari ${safari[1]}`
  return 'Unknown browser'
}

function buildIssueBody(
  description: string,
  steps: string,
  expected: string,
  actual: string,
  ctx: BugReportContext,
  appVersion: string,
): string {
  const modeLabel = ctx.mode === 'mock' ? 'Mock data' : ctx.mode === 'cache' ? 'Cache' : 'Live API'
  return [
    `## Description\n${description.trim() || '_No description provided_'}`,
    `## Steps to Reproduce\n${steps.trim() || '_Not provided_'}`,
    `## Expected Behavior\n${expected.trim() || '_Not provided_'}`,
    `## Actual Behavior\n${actual.trim() || '_Not provided_'}`,
    [
      '## Environment',
      `- **App Version**: ${appVersion}`,
      `- **Browser**: ${getBrowserInfo()}`,
      `- **Mode**: ${modeLabel}`,
      `- **Connected**: ${ctx.connected ? 'Yes' : 'No'}`,
      ctx.activeReport ? `- **Active Report**: ${ctx.activeReport}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    '_Reported via in-app bug reporter — no credentials included_',
  ].join('\n\n')
}

export function BugReportModal({ context, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [issueUrl, setIssueUrl] = useState<string | null>(null)
  const [issueNumber, setIssueNumber] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : context.appVersion
  const modeLabel = context.mode === 'mock' ? 'Mock data' : context.mode === 'cache' ? 'Cache' : 'Live API'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || submitState === 'submitting') return

    setSubmitState('submitting')
    setErrorMsg(null)

    const body = buildIssueBody(description, steps, expected, actual, context, appVersion)

    try {
      const res = await fetch('/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Bug: ${title.trim()}`, body }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? `Server error (${res.status})`)
      }

      const data = await res.json() as { issueUrl: string; issueNumber: number }
      setIssueUrl(data.issueUrl)
      setIssueNumber(data.issueNumber)
      setSubmitState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitState('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-base text-brand-navy">Report a Bug</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success state */}
        {submitState === 'success' && issueUrl && (
          <div className="p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Bug report submitted!</p>
              <p className="text-sm text-gray-500 mt-1">
                Issue #{issueNumber} has been created.
              </p>
            </div>
            <a
              href={issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 text-sm font-semibold bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors"
            >
              View issue →
            </a>
            <div>
              <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Close
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {submitState !== 'success' && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short summary of the bug"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What went wrong?"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Steps to Reproduce</label>
              <textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                rows={3}
                placeholder={'1. Go to…\n2. Click on…\n3. Observe…'}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Expected</label>
                <textarea
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  rows={2}
                  placeholder="What should have happened?"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Actual</label>
                <textarea
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  rows={2}
                  placeholder="What actually happened?"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy resize-none"
                />
              </div>
            </div>

            {/* Auto-captured context — no credentials */}
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-500 space-y-0.5">
              <div className="font-semibold text-gray-600 mb-1">Auto-captured (no credentials included)</div>
              <div>Version: {appVersion} · Browser: {getBrowserInfo()} · Mode: {modeLabel}</div>
              {context.activeReport && <div>Active report: {context.activeReport}</div>}
            </div>

            {submitState === 'error' && errorMsg && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {errorMsg} — please try again or contact a maintainer directly.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={!title.trim() || submitState === 'submitting'}
              >
                {submitState === 'submitting' ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
