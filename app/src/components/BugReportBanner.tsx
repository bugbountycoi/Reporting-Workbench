import { useState } from 'react'

const DISMISSED_KEY = 'wb_bug_banner_dismissed'

interface Props {
  onReport: () => void
}

export function BugReportBanner({ onReport }: Props) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISSED_KEY) === 'true',
  )

  if (dismissed) return null

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 bg-brand-navy/8 border-b border-brand-navy/10 text-sm"
      data-no-print
    >
      <span className="text-brand-gray-mid">
        Found something that doesn't look right?
      </span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onReport}
          className="px-3 py-1 text-xs font-semibold rounded-md bg-brand-navy text-white hover:bg-brand-navy/90 transition-colors"
        >
          Report a bug
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss banner"
          className="p-1 rounded hover:bg-black/5 text-brand-gray-mid hover:text-brand-navy transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
