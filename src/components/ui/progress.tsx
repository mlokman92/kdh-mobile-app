/**
 * Progress — a determinate bar, 0–100.
 *
 * `tone` colours the fill from the chart ramp so a condition score, an SLA
 * clock and a data-quality meter can all use the same component without any
 * hardcoded colours.
 */

import { View, type ViewProps } from 'react-native'

import { cn, cv } from '@/lib/cn'

export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger' | 'muted'

const fill = cv('h-full rounded-full', {
  variants: {
    tone: {
      primary: 'bg-primary',
      success: 'bg-chart-2',
      // No amber token in Ocean Breeze — a softened destructive keeps the
      // good → bad ramp legible without inventing a colour.
      warning: 'bg-destructive/55',
      danger: 'bg-destructive',
      muted: 'bg-muted-foreground',
    },
  },
  defaultVariants: { tone: 'primary' },
})

export interface ProgressProps extends ViewProps {
  /** 0–100. Values outside the range are clamped. */
  value: number
  tone?: ProgressTone
  /** Track height in points. Default 8. */
  height?: number
  className?: string
  /** Extra classes for the track. */
  trackClassName?: string
}

export function Progress({ value, tone = 'primary', height = 8, className, trackClassName, ...props }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      className={cn('w-full overflow-hidden rounded-full bg-muted', trackClassName, className)}
      style={{ height }}
      {...props}
    >
      <View className={fill({ tone })} style={{ width: `${pct}%` }} />
    </View>
  )
}

/** Map a 0–100 score to the tone a viewer expects (high = good). */
export function scoreTone(score: number): ProgressTone {
  if (score >= 80) return 'success'
  if (score >= 60) return 'primary'
  if (score >= 40) return 'warning'
  return 'danger'
}

/** Map a 0–100 risk score to a tone (high = bad). */
export function riskTone(score: number): ProgressTone {
  if (score >= 70) return 'danger'
  if (score >= 45) return 'warning'
  return 'success'
}
