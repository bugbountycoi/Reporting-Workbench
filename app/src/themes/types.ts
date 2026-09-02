export interface ThemeColors {
  navy: string
  navyLight: string
  navyMid: string
  blue: string
  blueDark: string
  blueLight: string
  orange: string
  orangeDark: string
  red: string
  green: string
  gold: string
  sky: string
  grayDark: string
  grayMid: string
  grayLight: string
  offWhite: string
  nearWhite: string
}

export interface ThemeFonts {
  /** Full CSS font-family value, e.g. "'Montserrat', system-ui, sans-serif" */
  heading: string
  body: string
}

export interface ThemeSpec {
  id: string
  name: string
  author?: string
  version?: string
  colors: ThemeColors
  fonts: ThemeFonts
  /** Inline SVG string rendered as an image in the header. Dark paths on transparent background work best (CSS filter inverts to white). */
  logoSvg?: string
  footerText?: string
}

export function isThemeSpec(value: unknown): value is ThemeSpec {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string' || typeof v.name !== 'string') return false
  if (typeof v.colors !== 'object' || v.colors === null) return false
  if (typeof v.fonts !== 'object' || v.fonts === null) return false
  const c = v.colors as Record<string, unknown>
  const requiredColors: (keyof ThemeColors)[] = [
    'navy', 'navyLight', 'navyMid', 'blue', 'blueDark', 'blueLight',
    'orange', 'orangeDark', 'red', 'green', 'gold', 'sky',
    'grayDark', 'grayMid', 'grayLight', 'offWhite', 'nearWhite',
  ]
  for (const key of requiredColors) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(c[key] as string)) return false
  }
  const f = v.fonts as Record<string, unknown>
  if (typeof f.heading !== 'string' || typeof f.body !== 'string') return false
  return true
}
