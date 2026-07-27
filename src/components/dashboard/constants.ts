/**
 * Dashboard-local constants and small pure helpers.
 *
 * Nothing here touches the shared foundation modules — it is the bits of
 * presentation that only Screen 1 cares about.
 */

import { withAlpha, type ThemeColors } from '@/lib/theme'
import type { Condition } from '@/lib/types'

/** The signed-in demo user. A KDH property officer, not a generic "Admin". */
export const DEMO_USER = {
  name: 'Zulkifli bin Ramli',
  /** How the app greets him — Malaysian office register. */
  salutation: 'Encik Zulkifli',
  role: 'Pengurus Aset Kanan',
  unit: 'Bahagian Pengurusan Harta · KDH',
} as const

/** Malay day names, indexed by Date#getDay(). */
const MALAY_DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'] as const

export function malayDay(date: Date): string {
  return MALAY_DAYS[date.getDay()]
}

/** Greeting switches on the hour, the way a Malaysian officer would say it. */
export function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Selamat pagi'
  if (hour < 15) return 'Selamat tengah hari'
  if (hour < 19) return 'Selamat petang'
  return 'Selamat malam'
}

/** Best → worst. Drives both the donut order and the legend order. */
export const CONDITION_ORDER: readonly Condition[] = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical']

/**
 * Ocean Breeze has no amber, so the good → bad ramp runs green → teal → three
 * strengths of the destructive token. This matches how StatusBadge already
 * tones the same words (success / success / warning / destructive).
 */
export function conditionColor(colors: ThemeColors, condition: Condition): string {
  switch (condition) {
    case 'Excellent':
      return colors.chart1
    case 'Good':
      return colors.chart2
    case 'Fair':
      return withAlpha(colors.destructive, 0.38)
    case 'Poor':
      return withAlpha(colors.destructive, 0.68)
    default:
      return colors.destructive
  }
}

/** Categories that can actually be let — occupancy is meaningless elsewhere. */
export const LETTABLE_CATEGORIES = new Set([
  'Commercial Property',
  'Industrial',
  'Tourism & Hospitality',
])
