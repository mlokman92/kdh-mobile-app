/**
 * StatTile — the KPI tile used across the dashboard.
 *
 * The sparkline is drawn with react-native-svg <Polyline>, so its stroke needs
 * a real colour: it comes from useThemeColors(), never from a class.
 */

import type { ReactNode } from 'react'
import { View, Text, type ViewProps } from 'react-native'
import Svg, { Polyline } from 'react-native-svg'

import { cn } from '@/lib/cn'
import { useThemeColors } from '@/lib/theme'
import type { Intent } from '@/lib/types'

const DELTA_TEXT: Record<Intent, string> = {
  positive: 'text-primary',
  negative: 'text-destructive',
  warning: 'text-destructive',
  neutral: 'text-muted-foreground',
}

export interface SparklineProps {
  /** Series, oldest first. Fewer than two points renders nothing. */
  data: number[]
  width?: number
  height?: number
  /** Resolved stroke colour. Defaults to the active primary. */
  color?: string
  strokeWidth?: number
}

export function Sparkline({ data, width = 72, height = 24, color, strokeWidth = 2 }: SparklineProps) {
  const colors = useThemeColors()
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pad = strokeWidth
  const stepX = (width - pad * 2) / (data.length - 1)

  const points = data
    .map((v, i) => {
      const x = pad + i * stepX
      const y = pad + (1 - (v - min) / span) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  // pointerEvents belongs in style now — the prop form is deprecated.
  return (
    <Svg width={width} height={height} style={{ pointerEvents: 'none' }}>
      <Polyline
        points={points}
        fill="none"
        stroke={color ?? colors.primary}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export interface StatTileProps extends ViewProps {
  label: string
  /** Already-formatted headline value, e.g. "RM 1.84b" or "94.2". */
  value: string | number
  /** Percentage change. Sign is rendered automatically. */
  delta?: number
  /** Caption under the delta, e.g. "vs last month". */
  deltaLabel?: string
  /**
   * Leading icon. Receives the resolved muted-foreground colour:
   * `icon={(c) => <Building2 size={16} color={c} />}`
   */
  icon?: ReactNode | ((color: string) => ReactNode)
  intent?: Intent
  /** 12-point series for the inline sparkline. */
  spark?: number[]
  /** Suffix rendered after the value, e.g. "%". */
  unit?: string
  className?: string
}

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  intent = 'neutral',
  spark,
  unit,
  className,
  ...props
}: StatTileProps) {
  const colors = useThemeColors()
  const sparkColor =
    intent === 'negative' || intent === 'warning' ? colors.destructive : colors.primary
  const iconNode = typeof icon === 'function' ? icon(colors.mutedForeground) : icon

  return (
    <View className={cn('gap-2 rounded-xl border border-border bg-card p-4', className)} {...props}>
      <View className="flex-row items-center gap-2">
        {iconNode}
        <Text className="flex-1 text-xs font-medium text-muted-foreground" numberOfLines={1}>
          {label}
        </Text>
      </View>

      <View className="flex-row items-end gap-1">
        <Text className="text-2xl font-bold text-card-foreground" numberOfLines={1}>
          {value}
        </Text>
        {unit ? <Text className="pb-1 text-sm font-medium text-muted-foreground">{unit}</Text> : null}
      </View>

      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          {delta === undefined ? null : (
            <Text className={cn('text-xs font-semibold', DELTA_TEXT[intent])}>
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)}%
              {deltaLabel ? <Text className="text-xs font-normal text-muted-foreground"> {deltaLabel}</Text> : null}
            </Text>
          )}
        </View>
        {spark && spark.length > 1 ? <Sparkline data={spark} color={sparkColor} /> : null}
      </View>
    </View>
  )
}
