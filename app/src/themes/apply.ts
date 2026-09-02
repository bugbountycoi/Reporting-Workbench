import type { ThemeSpec, ThemeColors } from './types'
import { getActiveThemeId, resolveTheme, setActiveThemeId } from './store'

const COLOR_VAR_MAP: Record<keyof ThemeColors, string> = {
  navy:      '--brand-navy',
  navyLight: '--brand-navy-light',
  navyMid:   '--brand-navy-mid',
  blue:      '--brand-blue',
  blueDark:  '--brand-blue-dark',
  blueLight: '--brand-blue-light',
  orange:     '--brand-orange',
  orangeDark: '--brand-orange-dark',
  red:       '--brand-red',
  green:     '--brand-green',
  gold:      '--brand-gold',
  sky:       '--brand-sky',
  grayDark:  '--brand-gray-dark',
  grayMid:   '--brand-gray-mid',
  grayLight: '--brand-gray-light',
  offWhite:  '--brand-off-white',
  nearWhite: '--brand-near-white',
}

export function applyTheme(spec: ThemeSpec): void {
  const root = document.documentElement
  for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
    root.style.setProperty(cssVar, spec.colors[key as keyof ThemeColors])
  }
  root.style.setProperty('--font-heading', spec.fonts.heading)
  root.style.setProperty('--font-body', spec.fonts.body)
  setActiveThemeId(spec.id)
}

/** Called synchronously in main.tsx before React mounts to prevent flash-of-unstyled-content. */
export function loadAndApplyTheme(): ThemeSpec {
  const spec = resolveTheme(getActiveThemeId())
  applyTheme(spec)
  return spec
}
