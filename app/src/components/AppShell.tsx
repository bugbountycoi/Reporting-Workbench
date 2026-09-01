import type { ReactNode } from 'react'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-near-white">
      <header className="bg-brand-navy text-white shadow-md" data-no-print>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <img
            src="/intigriti-logo.svg"
            alt="Intigriti"
            className="h-7"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <div className="h-5 w-px bg-white/20" />
          <span className="font-heading font-semibold text-sm text-white/90 tracking-wide">
            Reporting Workbench
          </span>
          <div className="ml-auto text-xs text-white/40 font-body">Local · Client-side only</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <footer className="text-center text-xs text-brand-gray-mid py-6 mt-8 border-t border-brand-gray-light font-body" data-no-print>
        Intigriti Reporting Workbench — data stays on your device &amp; goes only to the Intigriti API.
      </footer>
    </div>
  )
}
