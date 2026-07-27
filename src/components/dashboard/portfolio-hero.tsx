/** The headline portfolio card, over a filled revenue trend. */

import { useMemo } from 'react'
import { Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { TrendingDown, TrendingUp } from 'lucide-react-native'

import { Card } from '@/components/ui'
import { formatMYRCompact, formatNumber } from '@/lib/format'
import { useThemeColors, withAlpha } from '@/lib/theme'
import type { MonthlyTrend } from '@/lib/types'

const W = 320
const H = 64

export interface PortfolioHeroProps {
  totalValue: number
  netBookValue: number
  assetCount: number
  trend: MonthlyTrend[]
}

export function PortfolioHero({ totalValue, netBookValue, assetCount, trend }: PortfolioHeroProps) {
  const colors = useThemeColors()

  const { line, area, delta } = useMemo(() => {
    const series = trend.map((t) => t.revenue)
    if (series.length < 2) return { line: '', area: '', delta: 0 }

    const min = Math.min(...series)
    const max = Math.max(...series)
    const span = max - min || 1
    const step = W / (series.length - 1)

    const pts = series.map((v, i) => {
      const x = i * step
      const y = H - ((v - min) / span) * (H - 8) - 4
      return [x, y] as const
    })

    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
    const area = `${line}L${W},${H}L0,${H}Z`

    const first = series[0]
    const last = series[series.length - 1]
    const delta = first > 0 ? ((last - first) / first) * 100 : 0

    return { line, area, delta }
  }, [trend])

  const up = delta >= 0

  return (
    <Card className="overflow-hidden">
      <View className="p-4">
        <Text className="text-xs font-medium text-muted-foreground">Nilai Portfolio · Portfolio value</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">{formatMYRCompact(totalValue)}</Text>

        <View className="mt-2 flex-row items-center gap-2">
          <View
            className={
              up
                ? 'flex-row items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5'
                : 'flex-row items-center gap-1 rounded-full bg-destructive/12 px-2 py-0.5'
            }
          >
            {up ? (
              <TrendingUp size={11} color={colors.primary} />
            ) : (
              <TrendingDown size={11} color={colors.destructive} />
            )}
            <Text
              className={up ? 'text-[11px] font-bold text-primary' : 'text-[11px] font-bold text-destructive'}
            >
              {up ? '+' : ''}
              {delta.toFixed(1)}%
            </Text>
          </View>
          <Text className="text-[11px] text-muted-foreground">revenue, trailing 12 months</Text>
        </View>
      </View>

      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="pf" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity={0.28} />
            <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {area ? <Path d={area} fill="url(#pf)" /> : null}
        {line ? <Path d={line} stroke={colors.primary} strokeWidth={2} fill="none" /> : null}
      </Svg>

      <View className="flex-row border-t border-border">
        <Stat label="Net book value" value={formatMYRCompact(netBookValue)} />
        <View className="w-px bg-border" />
        <Stat label="Assets" value={formatNumber(assetCount)} />
        <View className="w-px bg-border" />
        <Stat
          label="Avg value"
          value={formatMYRCompact(assetCount > 0 ? totalValue / assetCount : 0)}
        />
      </View>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 p-3">
      <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text className="mt-0.5 text-sm font-bold text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}
