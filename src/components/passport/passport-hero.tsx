/**
 * A generated hero banner — no image files anywhere in the app.
 *
 * Each category gets its own abstract silhouette (buildings, land parcels, a
 * jetty, plantation rows) drawn over a tint derived from the asset's photoTint,
 * so 48 assets never look like the same stock photo repeated.
 */

import { Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Path, Rect, Stop, Circle, Line } from 'react-native-svg'

import { StatusBadge } from '@/components/ui'
import { tintColor, useThemeColors, withAlpha } from '@/lib/theme'
import type { Asset } from '@/lib/types'

const H = 200

export function PassportHero({ asset, topInset }: { asset: Asset; topInset: number }) {
  const colors = useThemeColors()
  const tint = tintColor(colors, asset.photoTint)
  const height = H + topInset

  return (
    <View style={{ height }} className="overflow-hidden">
      <Svg width="100%" height={height} viewBox={`0 0 400 ${height}`} preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tint} stopOpacity={0.9} />
            <Stop offset="1" stopColor={colors.card} stopOpacity={1} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={400} height={height} fill="url(#hero)" />
        <Silhouette category={asset.category} colors={colors} height={height} />
      </Svg>

      {/* Identity overlay */}
      <View className="absolute bottom-0 left-0 right-0 p-4">
        <Text className="font-mono text-[11px] font-semibold" style={{ color: colors.foreground }}>
          {asset.code}
        </Text>
        <Text className="mt-0.5 text-xl font-bold" style={{ color: colors.foreground }} numberOfLines={2}>
          {asset.name}
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          <StatusBadge status={asset.status} />
          <StatusBadge status={asset.condition} />
          <StatusBadge status={asset.criticality} />
        </View>
      </View>
    </View>
  )
}

function Silhouette({
  category,
  colors,
  height,
}: {
  category: Asset['category']
  colors: ReturnType<typeof useThemeColors>
  height: number
}) {
  const ink = withAlpha(colors.foreground, 0.13)
  const base = height - 34

  switch (category) {
    case 'Land':
      // Stacked land parcels receding into the distance.
      return (
        <>
          <Path d={`M0 ${base} L120 ${base - 40} L280 ${base - 24} L400 ${base - 52} L400 ${height} L0 ${height} Z`} fill={ink} />
          <Path d={`M0 ${base + 16} L160 ${base - 6} L400 ${base + 4} L400 ${height} L0 ${height} Z`} fill={withAlpha(colors.foreground, 0.09)} />
          <Line x1={40} y1={base - 4} x2={360} y2={base - 18} stroke={withAlpha(colors.foreground, 0.16)} strokeWidth={1.5} strokeDasharray="6 6" />
        </>
      )

    case 'Tourism & Hospitality':
      // Shoreline with a jetty running out to sea.
      return (
        <>
          <Path d={`M0 ${base + 6} Q100 ${base - 14} 200 ${base + 2} T400 ${base - 6} L400 ${height} L0 ${height} Z`} fill={ink} />
          <Rect x={210} y={base - 30} width={120} height={5} fill={withAlpha(colors.foreground, 0.18)} />
          {[220, 250, 280, 310].map((x) => (
            <Rect key={x} x={x} y={base - 25} width={4} height={26} fill={withAlpha(colors.foreground, 0.16)} />
          ))}
          <Circle cx={330} cy={base - 46} r={13} fill={withAlpha(colors.foreground, 0.14)} />
        </>
      )

    case 'Industrial':
      // Factory sheds with a stack.
      return (
        <>
          <Rect x={30} y={base - 54} width={150} height={54} fill={ink} />
          <Path d={`M30 ${base - 54} L70 ${base - 76} L110 ${base - 54} Z`} fill={withAlpha(colors.foreground, 0.16)} />
          <Rect x={200} y={base - 40} width={170} height={40} fill={withAlpha(colors.foreground, 0.1)} />
          <Rect x={330} y={base - 96} width={16} height={96} fill={withAlpha(colors.foreground, 0.15)} />
        </>
      )

    case 'Infrastructure':
      // A bridge span.
      return (
        <>
          <Rect x={0} y={base - 12} width={400} height={9} fill={ink} />
          <Path d={`M20 ${base - 12} Q200 ${base - 96} 380 ${base - 12}`} stroke={withAlpha(colors.foreground, 0.18)} strokeWidth={3} fill="none" />
          {[80, 160, 240, 320].map((x) => (
            <Rect key={x} x={x} y={base - 12} width={4} height={20} fill={withAlpha(colors.foreground, 0.14)} />
          ))}
        </>
      )

    default: {
      // Commercial / civic block: a small skyline.
      const blocks = [
        { x: 30, w: 54, h: 84 },
        { x: 94, w: 44, h: 118 },
        { x: 148, w: 62, h: 66 },
        { x: 220, w: 48, h: 100 },
        { x: 278, w: 58, h: 76 },
        { x: 344, w: 40, h: 110 },
      ]
      return (
        <>
          {blocks.map((b) => (
            <Rect key={b.x} x={b.x} y={base - b.h} width={b.w} height={b.h} fill={ink} />
          ))}
          {blocks.map((b) =>
            [0, 1, 2].map((r) =>
              [0, 1].map((c) => (
                <Rect
                  key={`${b.x}-${r}-${c}`}
                  x={b.x + 10 + c * 18}
                  y={base - b.h + 14 + r * 22}
                  width={9}
                  height={11}
                  fill={withAlpha(colors.foreground, 0.09)}
                />
              )),
            ),
          )}
        </>
      )
    }
  }
}
