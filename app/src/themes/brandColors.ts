/** CSS custom property references for every brand color token. */
export const BC = {
  navy:       'var(--brand-navy)',
  navyLight:  'var(--brand-navy-light)',
  navyMid:    'var(--brand-navy-mid)',
  blue:       'var(--brand-blue)',
  blueDark:   'var(--brand-blue-dark)',
  blueLight:  'var(--brand-blue-light)',
  orange:     'var(--brand-orange)',
  orangeDark: 'var(--brand-orange-dark)',
  red:        'var(--brand-red)',
  green:      'var(--brand-green)',
  gold:       'var(--brand-gold)',
  sky:        'var(--brand-sky)',
  grayDark:   'var(--brand-gray-dark)',
  grayMid:    'var(--brand-gray-mid)',
  grayLight:  'var(--brand-gray-light)',
  offWhite:   'var(--brand-off-white)',
  nearWhite:  'var(--brand-near-white)',
} as const

/** Brand CSS var strings for cycling across multi-program compare chart series. */
export const BRAND_COMPARE_COLORS: string[] = [
  BC.blue, BC.green, BC.red, BC.gold, BC.sky, BC.orange, BC.grayMid,
]

/**
 * Resolves a CSS custom property string to an actual hex color at call time.
 * Pass-through for bare hex values. Required for Recharts SVG attributes and
 * <input type="color"> which cannot consume CSS variable strings.
 */
export function resolveColor(cssVarOrHex: string): string {
  if (!cssVarOrHex.startsWith('var(')) return cssVarOrHex
  const m = cssVarOrHex.match(/var\(([^),]+)/)
  if (!m) return cssVarOrHex
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || cssVarOrHex
}
