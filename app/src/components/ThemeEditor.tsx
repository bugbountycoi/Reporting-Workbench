import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../themes/ThemeProvider'
import type { ThemeColors, ThemeSpec } from '../themes/types'
import { COLOR_VAR_MAP } from '../themes/apply'
import { BUILTIN_IDS } from '../themes/store'

interface ColorTokenMeta {
  key: keyof ThemeColors
  label: string
  usage: string
}

const COLOR_GROUPS: { heading: string; tokens: ColorTokenMeta[] }[] = [
  {
    heading: 'Header & Navigation',
    tokens: [
      { key: 'navy',      label: 'Navy',       usage: 'App header background, primary action buttons' },
      { key: 'navyLight', label: 'Navy Light',  usage: 'Button hover states, lighter header elements' },
      { key: 'navyMid',   label: 'Navy Mid',    usage: 'Active navigation items, mid-tone header accents' },
    ],
  },
  {
    heading: 'Primary Accent',
    tokens: [
      { key: 'blue',      label: 'Blue',       usage: 'Primary accent, links, chart series, selected card borders' },
      { key: 'blueDark',  label: 'Blue Dark',  usage: 'Link hover states, dark chart variant' },
      { key: 'blueLight', label: 'Blue Light', usage: 'Supplementary chart series, secondary accent' },
    ],
  },
  {
    heading: 'Secondary Accent',
    tokens: [
      { key: 'orange',     label: 'Orange',      usage: 'Snapshot category badges, warning highlights, chart series' },
      { key: 'orangeDark', label: 'Orange Dark', usage: 'Orange badge text, warning label foreground' },
    ],
  },
  {
    heading: 'Status Colors',
    tokens: [
      { key: 'red',   label: 'Red',      usage: 'Errors, danger states, security warning text' },
      { key: 'green', label: 'Green',    usage: 'Connected status, Bounty category badges, chart series' },
      { key: 'gold',  label: 'Gold',     usage: 'Chart series highlight, gold accent' },
      { key: 'sky',   label: 'Sky Blue', usage: 'Supplementary chart series' },
    ],
  },
  {
    heading: 'Neutral',
    tokens: [
      { key: 'grayDark',  label: 'Gray Dark',  usage: 'Secondary text, meta information' },
      { key: 'grayMid',   label: 'Gray Mid',   usage: 'Placeholder text, Developer category, muted labels' },
      { key: 'grayLight', label: 'Gray Light', usage: 'Borders, dividers, chart grid lines' },
      { key: 'offWhite',  label: 'Off White',  usage: 'Page & card backgrounds' },
      { key: 'nearWhite', label: 'Near White', usage: 'Alternate row backgrounds, PNG export background' },
    ],
  },
]

function isValidHex(s: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(s)
}

function ColorRow({
  meta,
  value,
  originalValue,
  onChange,
}: {
  meta: ColorTokenMeta
  value: string
  originalValue: string
  onChange: (key: keyof ThemeColors, color: string) => void
}) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const [hexText, setHexText] = useState(value)

  // Keep hex text in sync when value changes from outside
  useEffect(() => { setHexText(value) }, [value])

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value.toUpperCase()
    setHexText(hex)
    onChange(meta.key, hex)
  }

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setHexText(raw)
    const norm = raw.startsWith('#') ? raw : `#${raw}`
    if (isValidHex(norm)) onChange(meta.key, norm.toUpperCase())
  }

  const handleHexBlur = () => {
    // Restore to the last valid color if the text is invalid
    if (!isValidHex(hexText)) setHexText(value)
  }

  const isModified = value !== originalValue

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {/* Clickable swatch — opens color picker */}
      <button
        type="button"
        onClick={() => pickerRef.current?.click()}
        className="w-10 h-10 rounded-lg shadow-sm ring-1 ring-black/10 shrink-0 transition-transform hover:scale-110"
        style={{ background: value }}
        title="Click to open color picker"
      />
      <input
        ref={pickerRef}
        type="color"
        value={value}
        onChange={handlePickerChange}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Labels */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-tight">{meta.label}</p>
        <p className="text-xs text-gray-400 leading-snug mt-0.5">{meta.usage}</p>
      </div>

      {/* Hex text input */}
      <input
        type="text"
        value={hexText}
        onChange={handleHexChange}
        onBlur={handleHexBlur}
        maxLength={7}
        spellCheck={false}
        className="w-24 font-mono text-xs border border-gray-200 rounded-md px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />

      {/* Reset to original */}
      <div className="w-12 shrink-0 text-right">
        {isModified && (
          <button
            type="button"
            onClick={() => onChange(meta.key, originalValue)}
            className="text-xs text-gray-400 hover:text-brand-blue transition-colors"
            title="Reset to original"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

interface Props {
  initialTheme: ThemeSpec
  onClose: () => void
}

function ThemeEditorModal({ initialTheme, onClose }: Props) {
  const { saveTheme } = useTheme()
  const savedRef = useRef(false)

  const [themeName, setThemeName] = useState(
    BUILTIN_IDS.has(initialTheme.id) ? `${initialTheme.name} (custom)` : initialTheme.name
  )
  const [colors, setColors] = useState<ThemeColors>({ ...initialTheme.colors })

  // Apply color changes live to the DOM
  useEffect(() => {
    const root = document.documentElement
    for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
      root.style.setProperty(cssVar, colors[key as keyof ThemeColors])
    }
  }, [colors])

  // Restore original theme when the editor closes without saving
  useEffect(() => {
    return () => {
      if (!savedRef.current) {
        const root = document.documentElement
        for (const [key, cssVar] of Object.entries(COLOR_VAR_MAP)) {
          root.style.setProperty(cssVar, initialTheme.colors[key as keyof ThemeColors])
        }
      }
    }
  }, [initialTheme])

  const handleColorChange = (key: keyof ThemeColors, hex: string) => {
    setColors((prev) => ({ ...prev, [key]: hex }))
  }

  const buildSpec = (): ThemeSpec => {
    const isBuiltin = BUILTIN_IDS.has(initialTheme.id)
    const id = isBuiltin
      ? `user-${themeName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`
      : initialTheme.id
    return {
      ...initialTheme,
      id,
      name: themeName.trim() || initialTheme.name,
      colors,
    }
  }

  const handleSave = () => {
    savedRef.current = true
    saveTheme(buildSpec())
    onClose()
  }

  const handleExport = () => {
    const spec = buildSpec()
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${spec.name.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasChanges =
    themeName !== initialTheme.name ||
    (Object.keys(colors) as (keyof ThemeColors)[]).some((k) => colors[k] !== initialTheme.colors[k])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-heading font-semibold text-gray-900 text-base">Theme Editor</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Based on <span className="font-medium text-gray-600">{initialTheme.name}</span>
              {' — changes preview live in the app'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
            aria-label="Close editor"
          >
            ✕
          </button>
        </div>

        {/* Theme name */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Theme name</label>
          <input
            type="text"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            placeholder="My Custom Theme"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
        </div>

        {/* Color groups — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-2">
          {COLOR_GROUPS.map((group) => (
            <div key={group.heading} className="mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 pt-2">
                {group.heading}
              </p>
              {group.tokens.map((meta) => (
                <ColorRow
                  key={meta.key}
                  meta={meta}
                  value={colors[meta.key]}
                  originalValue={initialTheme.colors[meta.key]}
                  onChange={handleColorChange}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-gray-300 text-sm font-semibold text-gray-700 rounded-lg hover:border-gray-400 hover:bg-white transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={handleSave}
              disabled={!themeName.trim()}
              className="px-4 py-2 bg-brand-navy text-white text-sm font-semibold rounded-lg hover:bg-brand-navy-light disabled:opacity-40 transition-colors"
            >
              {hasChanges ? 'Save & Apply' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ThemeEditor({ initialTheme, onClose }: Props) {
  return createPortal(
    <ThemeEditorModal initialTheme={initialTheme} onClose={onClose} />,
    document.body
  )
}
