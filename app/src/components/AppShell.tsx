import type { ReactNode } from 'react'
import { useTheme } from '../themes/ThemeProvider'

interface Props {
  children: ReactNode
  headerActions?: ReactNode
  banner?: ReactNode
}

function LogoImg({ logoSvg, name }: { logoSvg?: string; name: string }) {
  if (!logoSvg) return null
  const encoded = encodeURIComponent(logoSvg)
  return (
    <img
      src={`data:image/svg+xml;charset=utf-8,${encoded}`}
      alt={name}
      className="h-7"
      style={{ filter: 'brightness(0) invert(1)' }}
    />
  )
}

export function AppShell({ children, headerActions, banner }: Props) {
  const { activeTheme } = useTheme()

  return (
    <div className="min-h-screen bg-brand-near-white">
      <header className="bg-brand-navy text-white shadow-md" data-no-print>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <LogoImg logoSvg={activeTheme.logoSvg} name={activeTheme.name} />
          <div className="h-5 w-px bg-white/20" />
          <span className="font-heading font-semibold text-sm text-white/90 tracking-wide">
            Reporting Workbench
          </span>
          <div className="ml-auto flex items-center gap-2">
            {headerActions}
          </div>
        </div>
      </header>

      {banner}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>

      <footer
        className="text-center text-xs text-brand-gray-mid py-6 mt-8 border-t border-brand-gray-light font-body"
        data-no-print
      >
        Reporting Workbench
        {activeTheme.footerText ? ` — ${activeTheme.footerText}` : ''}
      </footer>
    </div>
  )
}
