import { useState } from 'react'

const GITHUB_REPO = 'bugbountycoi/Reporting-Workbench'

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

function buildIssueUrl(title: string, body: string): string {
  const params = new URLSearchParams({ title: `Bug: ${title}`, body, labels: 'bug' })
  return `https://github.com/${GITHUB_REPO}/issues/new?${params.toString()}`
}

export function BugReportModal({ context, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [actual, setActual] = useState('')

  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : context.appVersion
  const browser = getBrowserInfo()
  const modeLabel = context.mode === 'mock' ? 'Mock data' : context.mode === 'cache' ? 'Cache' : 'Live API'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const body = [
      `## Description\n${description.trim() || '_No description provided_'}`,
      `## Steps to Reproduce\n${steps.trim() || '_Not provided_'}`,
      `## Expected Behavior\n${expected.trim() || '_Not provided_'}`,
      `## Actual Behavior\n${actual.trim() || '_Not provided_'}`,
      [
        '## Environment',
        `- **App Version**: ${appVersion}`,
        `- **Browser**: ${browser}`,
        `- **Mode**: ${modeLabel}`,
        `- **Connected**: ${context.connected ? 'Yes' : 'No'}`,
        context.activeReport ? `- **Active Report**: ${context.activeReport}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      '_Reported via in-app bug reporter_',
    ].join('\n\n')

    window.open(buildIssueUrl(title.trim(), body), '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
              placeholder="1. Go to…&#10;2. Click on…&#10;3. Observe…"
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

          {/* Auto-captured context — read-only, no secrets */}
          <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-500 space-y-0.5">
            <div className="font-semibold text-gray-600 mb-1">Auto-captured (no credentials included)</div>
            <div>Version: {appVersion} · Browser: {browser} · Mode: {modeLabel}</div>
            {context.activeReport && <div>Active report: {context.activeReport}</div>}
          </div>

          <p className="text-xs text-gray-400">
            Clicking "Open GitHub Issue" will open a pre-filled issue on GitHub in a new tab.
            You'll need a GitHub account to submit it.
          </p>

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
              className="px-4 py-2 text-sm font-semibold bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors disabled:opacity-50"
              disabled={!title.trim()}
            >
              Open GitHub Issue →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
