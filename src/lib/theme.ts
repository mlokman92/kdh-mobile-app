/**
 * The bridge between NativeWind classNames and react-native-svg.
 *
 * Tailwind classes cannot be handed to SVG `fill` / `stroke` props — those need
 * real colour strings. Every hex below is the sRGB twin of the "R G B" triplet
 * in `src/global.css`, which in turn is the Ocean Breeze oklch() token from the
 * web console. Keep the three in sync: global.css → tailwind.config.js → here.
 *
 * NEVER inline a hex literal in a component. Pull it from `useThemeColors()`.
 */

import { colorScheme as nwColorScheme, useColorScheme } from 'nativewind'
import type { PhotoTint } from './types'

export type ColorSchemeName = 'light' | 'dark'
export type ColorSchemePreference = ColorSchemeName | 'system'

export interface ThemeColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  border: string
  ring: string
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
  /** Water fill for the map — a touch bluer/deeper than `background`. */
  sea: string
  /** Landmass fill for the map — the card surface, so pins read as ink on paper. */
  land: string
}

export const LIGHT_COLORS: ThemeColors = {
  background: '#f0f8ff',
  foreground: '#374151',
  card: '#ffffff',
  cardForeground: '#374151',
  popover: '#ffffff',
  primary: '#22c55e',
  primaryForeground: '#ffffff',
  secondary: '#e0f2fe',
  secondaryForeground: '#4b5563',
  muted: '#f3f4f6',
  mutedForeground: '#6b7280',
  accent: '#d1fae5',
  accentForeground: '#374151',
  destructive: '#ef4444',
  border: '#e5e7eb',
  ring: '#22c55e',
  chart1: '#22c55e',
  chart2: '#10b981',
  chart3: '#059669',
  chart4: '#047857',
  chart5: '#065f46',
  // Derived: background (240,248,255) pulled towards the sea → (219,236,250).
  sea: '#dbecfa',
  // Derived: the card surface.
  land: '#ffffff',
}

export const DARK_COLORS: ThemeColors = {
  background: '#0f172a',
  foreground: '#d1d5db',
  card: '#1e293b',
  cardForeground: '#d1d5db',
  popover: '#1e293b',
  primary: '#34d399',
  primaryForeground: '#0f172a',
  secondary: '#2d3748',
  secondaryForeground: '#a1a1aa',
  muted: '#19212e',
  mutedForeground: '#6b7280',
  accent: '#374151',
  accentForeground: '#a1a1aa',
  destructive: '#ef4444',
  border: '#4b5563',
  ring: '#34d399',
  chart1: '#34d399',
  chart2: '#2dd4bf',
  chart3: '#22c55e',
  chart4: '#10b981',
  chart5: '#059669',
  // Derived: background (15,23,42) pushed deeper and bluer → (11,27,52).
  sea: '#0b1b34',
  // Derived: the card surface.
  land: '#1e293b',
}

/** Non-hook accessor — for module scope, worklets and helper functions. */
export function themeColors(scheme: ColorSchemeName): ThemeColors {
  return scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS
}

/**
 * Resolved palette for the active scheme.
 *
 * ```tsx
 * const c = useThemeColors()
 * <Circle cx={x} cy={y} r={6} fill={c.primary} stroke={c.card} />
 * ```
 */
export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme()
  return themeColors(colorScheme === 'dark' ? 'dark' : 'light')
}

/** The active scheme, already narrowed (NativeWind can return undefined). */
export function useColorSchemeName(): ColorSchemeName {
  const { colorScheme } = useColorScheme()
  return colorScheme === 'dark' ? 'dark' : 'light'
}

export interface ThemeToggle {
  /** The scheme currently painted. */
  scheme: ColorSchemeName
  /** Force a scheme, or hand control back to the OS with 'system'. */
  setScheme: (next: ColorSchemePreference) => void
  /** Flip light ⇄ dark. */
  toggle: () => void
}

/** Thin wrapper over NativeWind 4's colour-scheme API. */
export function useThemeToggle(): ThemeToggle {
  const { colorScheme, setColorScheme, toggleColorScheme } = useColorScheme()
  return {
    scheme: colorScheme === 'dark' ? 'dark' : 'light',
    setScheme: setColorScheme,
    toggle: toggleColorScheme,
  }
}

/** Imperative escape hatch (outside React), e.g. from a splash bootstrap. */
export const colorScheme = nwColorScheme

/* ------------------------------------------------------------------ */
/* Photo tints — the generated hero banner on the asset passport        */
/* ------------------------------------------------------------------ */

/** Resolve an asset's `photoTint` to a real colour for SVG gradients. */
export function tintColor(colors: ThemeColors, tint: PhotoTint): string {
  return colors[tint]
}

/** Same tint as a Tailwind background class, for plain <View> banners. */
export const PHOTO_TINT_BG: Record<PhotoTint, string> = {
  chart1: 'bg-chart-1',
  chart2: 'bg-chart-2',
  chart3: 'bg-chart-3',
  chart4: 'bg-chart-4',
  chart5: 'bg-chart-5',
  primary: 'bg-primary',
}

/**
 * `#22c55e` + 0.15 → `rgba(34,197,94,0.15)`.
 *
 * For translucent SVG fills where fillOpacity would also affect the stroke, and
 * for the few RN style props that need a colour string rather than a class.
 */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}

/** The chart series colours in plotting order. */
export function chartSeries(colors: ThemeColors): string[] {
  return [colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5]
}
