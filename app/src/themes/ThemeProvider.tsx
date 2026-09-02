import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ThemeSpec } from './types'
import { applyTheme, loadAndApplyTheme } from './apply'
import { getAllThemes, deleteUserTheme, BUILTIN_IDS } from './store'
import { installThemeFromJson, installThemeFromUrl } from './loader'

interface ThemeContextValue {
  activeTheme: ThemeSpec
  allThemes: ThemeSpec[]
  builtinIds: Set<string>
  setActiveTheme: (spec: ThemeSpec) => void
  installFromJson: (json: unknown) => Promise<ThemeSpec>
  installFromUrl: (url: string) => Promise<ThemeSpec>
  uninstallTheme: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveThemeState] = useState<ThemeSpec>(() => loadAndApplyTheme())
  const [allThemes, setAllThemes] = useState<ThemeSpec[]>(() => getAllThemes())

  const refresh = useCallback(() => setAllThemes(getAllThemes()), [])

  const setActiveTheme = useCallback((spec: ThemeSpec) => {
    applyTheme(spec)
    setActiveThemeState(spec)
  }, [])

  const installFromJson = useCallback(async (json: unknown): Promise<ThemeSpec> => {
    const spec = await installThemeFromJson(json)
    refresh()
    return spec
  }, [refresh])

  const installFromUrl = useCallback(async (url: string): Promise<ThemeSpec> => {
    const spec = await installThemeFromUrl(url)
    refresh()
    return spec
  }, [refresh])

  const uninstallTheme = useCallback((id: string) => {
    deleteUserTheme(id)
    refresh()
  }, [refresh])

  const value = useMemo<ThemeContextValue>(() => ({
    activeTheme,
    allThemes,
    builtinIds: BUILTIN_IDS,
    setActiveTheme,
    installFromJson,
    installFromUrl,
    uninstallTheme,
  }), [activeTheme, allThemes, setActiveTheme, installFromJson, installFromUrl, uninstallTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
