import type { CSSProperties } from 'react'

export const THEMES = [
  { id: 'sunset', name: 'Sunset', start: '#ff6a45', end: '#dc2a85' },
  { id: 'ocean', name: 'Ocean', start: '#22a9eb', end: '#3547d5' },
  { id: 'emerald', name: 'Emerald', start: '#22b58f', end: '#087a68' },
  { id: 'berry', name: 'Berry', start: '#a93dd8', end: '#dd237c' },
  { id: 'midnight', name: 'Midnight', start: '#34318e', end: '#14144e' },
  { id: 'tangerine', name: 'Tangerine', start: '#ff9a29', end: '#ef5a1d' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'ocean'

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}

export function getTheme(themeId: ThemeId) {
  return THEMES.find((theme) => theme.id === themeId) ?? THEMES[1]
}

export function getThemeStyle(themeId: ThemeId, backgroundImageDataUrl?: string): CSSProperties {
  const theme = getTheme(themeId)
  return {
    '--theme-start': theme.start,
    '--theme-end': theme.end,
    backgroundImage: backgroundImageDataUrl
      ? `linear-gradient(135deg, rgba(16, 18, 62, .3), rgba(26, 24, 89, .62)), url("${backgroundImageDataUrl}")`
      : `linear-gradient(135deg, ${theme.start}, ${theme.end})`,
  } as CSSProperties
}

export function getBoardStyle(themeId: ThemeId, backgroundImageDataUrl?: string): CSSProperties {
  const theme = getTheme(themeId)
  return {
    '--theme-start': theme.start,
    '--theme-end': theme.end,
    backgroundImage: backgroundImageDataUrl
      ? `linear-gradient(180deg, rgba(13, 40, 98, .18), rgba(31, 25, 119, .72)), url("${backgroundImageDataUrl}")`
      : `linear-gradient(180deg, ${theme.start} 0%, ${theme.end} 100%)`,
  } as CSSProperties
}
