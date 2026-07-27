/** Asset condition mix as a donut with a centre health score. */

import { useMemo } from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'

import { Card } from '@/components/ui'
import { CONDITION_ORDER, conditionColor } from '@/components/dashboard/constants'
import { useThemeColors } from '@/lib/theme'
import type { Asset, Condition } from '@/lib/types'

const SIZE = 132
const STROKE = 16
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

export function ConditionDonut({ assets }: { assets: Asset[] }) {
  const colors = useThemeColors()

  const { rows, total, avgScore } = useMemo(() => {
    const counts = new Map<Condition, number>()
    for (const c of CONDITION_ORDER) counts.set(c, 0)
    let scoreSum = 0
    for (const a of assets) {
      counts.set(a.condition, (counts.get(a.condition) ?? 0) + 1)
      scoreSum += a.conditionScore
    }
    const total = assets.length
    const rows = CONDITION_ORDER.map((condition) => {
      const count = counts.get(condition) ?? 0
      return { condition, count, pct: total > 0 ? (count / total) * 100 : 0 }
    })
    return { rows, total, avgScore: total > 0 ? scoreSum / total : 0 }
  }, [assets])

  // Walk the ring, accumulating offsets so segments sit end to end.
  let offset = 0
  const segments = rows.map((r) => {
    const len = (r.pct / 100) * C
    const seg = { ...r, dash: len, offset }
    offset += len
    return seg
  })

  return (
    <Card className="flex-row items-center gap-4 p-4">
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          {/*
            Use the plain SVG transform string, not react-native-svg's
            rotation/originX/originY props. On web those get serialised to a
            kebab-case `transform-origin` DOM attribute, which React rejects with
            "Invalid DOM property". The rotate() form works on both platforms.
          */}
          <G transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke={colors.muted}
              strokeWidth={STROKE}
              fill="none"
            />
            {segments.map((s) =>
              s.dash > 0 ? (
                <Circle
                  key={s.condition}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  stroke={conditionColor(colors, s.condition)}
                  strokeWidth={STROKE}
                  strokeDasharray={`${s.dash} ${C - s.dash}`}
                  strokeDashoffset={-s.offset}
                  fill="none"
                />
              ) : null,
            )}
          </G>
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-2xl font-bold text-foreground">{avgScore.toFixed(0)}</Text>
          <Text className="text-[10px] text-muted-foreground">health score</Text>
        </View>
      </View>

      <View className="flex-1 gap-2">
        {segments.map((s) => (
          <View key={s.condition} className="flex-row items-center gap-2">
            <View
              style={{ backgroundColor: conditionColor(colors, s.condition) }}
              className="h-2.5 w-2.5 rounded-full"
            />
            <Text className="flex-1 text-xs text-foreground" numberOfLines={1}>
              {s.condition}
            </Text>
            <Text className="text-xs font-semibold text-foreground">{s.count}</Text>
            <Text className="w-10 text-right text-[11px] text-muted-foreground">
              {s.pct.toFixed(0)}%
            </Text>
          </View>
        ))}
        <Text className="mt-1 text-[11px] text-muted-foreground">{total} assets assessed</Text>
      </View>
    </Card>
  )
}
