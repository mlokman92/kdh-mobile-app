/**
 * Shared display formatters — Malaysian locale (en-MY, Ringgit Malaysia).
 *
 * Ported verbatim from the web console's `src/lib/format.ts` so numbers read
 * identically on both products. `downloadCsv` is deliberately absent: there is
 * no DOM on native.
 */

const myr = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const myrCents = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** RM 1,250,000 */
export function formatMYR(value: number, withCents = false): string {
  if (!Number.isFinite(value)) return 'RM 0'
  return (withCents ? myrCents : myr).format(value).replace('MYR', 'RM ').replace(/\s+/g, ' ').trim()
}

/** Compact money for KPI tiles: RM 12.4j (juta) / RM 1.2b (bilion). */
export function formatMYRCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}RM ${(abs / 1_000_000_000).toFixed(2)}b`
  if (abs >= 1_000_000) return `${sign}RM ${(abs / 1_000_000).toFixed(2)}j`
  if (abs >= 1_000) return `${sign}RM ${(abs / 1_000).toFixed(0)}k`
  return `${sign}RM ${abs.toFixed(0)}`
}

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** 84.2% */
export function formatPct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0%'
  return `${value.toFixed(decimals)}%`
}

/** 27 Jul 2026 */
export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

/** 27 Jul 2026, 3:45 pm */
export function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/** "in 3 days" / "5 hours ago" */
export function formatRelative(iso?: string, now: Date = new Date()): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const diffMs = d.getTime() - now.getTime()
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
  ]
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit)
  }
  return 'just now'
}

/** Whole days between now and an ISO date (negative = in the past). */
export function daysUntil(iso?: string, now: Date = new Date()): number {
  if (!iso) return Number.NaN
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return Number.NaN
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/** 12,500 sqft */
export function formatArea(sqft: number): string {
  return `${formatNumber(sqft)} sqft`
}

/** 4.25 ha */
export function formatHectares(ha: number): string {
  return `${formatNumber(ha, 2)} ha`
}

/** Initials for avatars: "Nurul Aina binti Hassan" -> "NA" */
export function initials(name: string): string {
  const parts = name
    .replace(/\b(bin|binti|a\/l|a\/p|Dato'|Datuk|Dr\.|Hj\.|Hjh\.|Encik|Puan|Tuan)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
