/**
 * Screen 3 — GIS asset map.
 *
 * Pan/pinch run on the UI thread through Reanimated shared values, so gestures
 * never re-render the SVG. Only the zoom *level* is mirrored into React state
 * (on gesture end) because clustering depends on it.
 */

import { useCallback, useMemo, useState } from 'react'
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { router, useLocalSearchParams } from 'expo-router'
import { Crosshair, Layers, Minus, Plus, SlidersHorizontal } from 'lucide-react-native'

import { Basemap, type Cluster, type Pin } from '@/components/map/basemap'
import { MapInspector } from '@/components/map/map-inspector'
import { MAP_SIZE, project } from '@/lib/geo'
import { formatMYRCompact } from '@/lib/format'
import { useThemeColors } from '@/lib/theme'
import { useAppStore } from '@/store/app-store'
import {
  ASSET_CATEGORIES,
  CONDITIONS,
  type Asset,
  type Zone,
} from '@/lib/types'

const COLOUR_MODES = ['Category', 'Status', 'Condition', 'Criticality'] as const
type ColourMode = (typeof COLOUR_MODES)[number]

const SCREEN = Dimensions.get('window')
/** Fit the whole region on screen at rest. */
const BASE_SCALE = Math.min(SCREEN.width / MAP_SIZE.width, SCREEN.height / MAP_SIZE.height) * 1.05

export default function MapScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { assets, workOrdersForAsset } = useAppStore()
  const params = useLocalSearchParams<{ focus?: string }>()

  const [mode, setMode] = useState<ColourMode>('Category')
  const [selectedId, setSelectedId] = useState<string | null>(params.focus ?? null)
  const [zone, setZone] = useState<Zone | null>(null)
  const [showLayers, setShowLayers] = useState(false)
  const [layers, setLayers] = useState({ zones: true, towns: true, labels: true, graticule: true })
  const [zoomLevel, setZoomLevel] = useState(1)

  const scale = useSharedValue(BASE_SCALE)
  const baseScale = useSharedValue(BASE_SCALE)
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)

  const syncZoom = useCallback((s: number) => setZoomLevel(s / BASE_SCALE), [])

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = tx.value
      startY.value = ty.value
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX
      ty.value = startY.value + e.translationY
    })

  const pinch = Gesture.Pinch()
    .onStart(() => {
      baseScale.value = scale.value
    })
    .onUpdate((e) => {
      scale.value = Math.max(BASE_SCALE * 0.8, Math.min(BASE_SCALE * 6, baseScale.value * e.scale))
    })
    .onEnd(() => {
      runOnJS(syncZoom)(scale.value)
    })

  const gesture = Gesture.Simultaneous(pan, pinch)

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }))

  const zoomBy = useCallback(
    (factor: number) => {
      const next = Math.max(BASE_SCALE * 0.8, Math.min(BASE_SCALE * 6, scale.value * factor))
      scale.value = withTiming(next, { duration: 180 })
      setZoomLevel(next / BASE_SCALE)
    },
    [scale],
  )

  const resetView = useCallback(() => {
    scale.value = withTiming(BASE_SCALE, { duration: 220 })
    tx.value = withTiming(0, { duration: 220 })
    ty.value = withTiming(0, { duration: 220 })
    setZoomLevel(1)
  }, [scale, tx, ty])

  const visible = useMemo(
    () => (zone ? assets.filter((a) => a.zone === zone) : assets),
    [assets, zone],
  )

  const colourFor = useCallback(
    (a: Asset): string => {
      const ramp = [colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5]
      switch (mode) {
        case 'Status':
          return a.status === 'Under Maintenance' || a.status === 'Idle'
            ? colors.destructive
            : a.status === 'Vacant'
              ? colors.chart3
              : colors.chart1
        case 'Condition': {
          const i = CONDITIONS.indexOf(a.condition)
          return i >= 3 ? colors.destructive : ramp[i] ?? colors.chart1
        }
        case 'Criticality':
          return a.criticality === 'Critical'
            ? colors.destructive
            : a.criticality === 'High'
              ? colors.chart3
              : colors.chart2
        default:
          return ramp[ASSET_CATEGORIES.indexOf(a.category) % ramp.length]
      }
    },
    [mode, colors],
  )

  /** Positions never change; only colour and clustering do. */
  const placed = useMemo(
    () => visible.map((a) => ({ asset: a, ...project(a.lat, a.lng) })),
    [visible],
  )

  const { pins, clusters } = useMemo(() => {
    const maxValue = Math.max(1, ...visible.map((a) => a.currentValue))
    const radius = (v: number) => 5 + (v / maxValue) * 7

    // Below ~1.6x the pins overlap badly, so bucket them onto a grid.
    if (zoomLevel >= 1.6) {
      return {
        pins: placed.map((p) => ({
          id: p.asset.id,
          x: p.x,
          y: p.y,
          color: colourFor(p.asset),
          r: radius(p.asset.currentValue),
        })) as Pin[],
        clusters: [] as Cluster[],
      }
    }

    const cell = 90
    const buckets = new Map<string, { x: number; y: number; items: typeof placed }>()
    for (const p of placed) {
      const key = `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`
      const b = buckets.get(key) ?? { x: 0, y: 0, items: [] }
      b.items.push(p)
      buckets.set(key, b)
    }

    const pins: Pin[] = []
    const clusters: Cluster[] = []
    for (const [key, b] of buckets) {
      if (b.items.length === 1) {
        const p = b.items[0]
        pins.push({
          id: p.asset.id,
          x: p.x,
          y: p.y,
          color: colourFor(p.asset),
          r: radius(p.asset.currentValue),
        })
        continue
      }
      const cx = b.items.reduce((s, i) => s + i.x, 0) / b.items.length
      const cy = b.items.reduce((s, i) => s + i.y, 0) / b.items.length
      clusters.push({ key, x: cx, y: cy, count: b.items.length })
    }
    return { pins, clusters }
  }, [placed, zoomLevel, colourFor, visible])

  const selected = selectedId ? assets.find((a) => a.id === selectedId) ?? null : null
  const totalValue = visible.reduce((s, a) => s + a.currentValue, 0)

  /** Map a tap in screen space back to the nearest pin. */
  const onCanvasPress = useCallback(
    (px: number, py: number) => {
      let best: { id: string; d: number } | null = null
      for (const p of pins) {
        const d = Math.hypot(p.x - px, p.y - py)
        if (d < 26 && (!best || d < best.d)) best = { id: p.id, d }
      }
      setSelectedId(best ? best.id : null)
    },
    [pins],
  )

  return (
    <View className="flex-1 bg-background">
      <GestureDetector gesture={gesture}>
        <View className="flex-1 overflow-hidden">
          <Animated.View
            style={[
              {
                width: MAP_SIZE.width,
                height: MAP_SIZE.height,
                position: 'absolute',
                left: (SCREEN.width - MAP_SIZE.width) / 2,
                top: (SCREEN.height - MAP_SIZE.height) / 2,
              },
              canvasStyle,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Map canvas. Tap an asset pin to inspect it."
              onPress={(e) => onCanvasPress(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            >
              <Basemap
                colors={colors}
                pins={pins}
                clusters={clusters}
                selectedId={selectedId}
                selectedZone={zone}
                showZones={layers.zones}
                showTowns={layers.towns}
                showLabels={layers.labels}
                showGraticule={layers.graticule}
              />
            </Pressable>
          </Animated.View>
        </View>
      </GestureDetector>

      {/* ---- Top control bar ---- */}
      <View style={{ top: insets.top + 8 }} className="absolute left-0 right-0 px-4">
        <View className="rounded-xl border border-border bg-card/95 p-2">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">GIS Asset Map</Text>
              <Text className="text-[11px] text-muted-foreground">
                {visible.length} assets · {formatMYRCompact(totalValue)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Layers"
              onPress={() => setShowLayers((v) => !v)}
              className="h-9 w-9 items-center justify-center rounded-lg border border-border active:bg-muted"
            >
              <Layers size={16} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Colour-by */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingTop: 8 }}
          >
            {COLOUR_MODES.map((m) => (
              <Chip key={m} label={m} active={mode === m} onPress={() => setMode(m)} />
            ))}
            <View className="w-2" />
            <Chip label="All zones" active={zone === null} onPress={() => setZone(null)} />
          </ScrollView>

          {showLayers ? (
            <View className="mt-2 flex-row flex-wrap gap-2 border-t border-border pt-2">
              {(['zones', 'towns', 'labels', 'graticule'] as const).map((k) => (
                <Chip
                  key={k}
                  label={k[0].toUpperCase() + k.slice(1)}
                  active={layers[k]}
                  onPress={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {/* ---- Zoom controls ---- */}
      <View style={{ bottom: insets.bottom + 130 }} className="absolute right-4 gap-2">
        <MapButton label="Zoom in" onPress={() => zoomBy(1.5)}>
          <Plus size={18} color={colors.foreground} />
        </MapButton>
        <MapButton label="Zoom out" onPress={() => zoomBy(1 / 1.5)}>
          <Minus size={18} color={colors.foreground} />
        </MapButton>
        <MapButton label="Reset view" onPress={resetView}>
          <Crosshair size={18} color={colors.foreground} />
        </MapButton>
      </View>

      {/* ---- Legend ---- */}
      <View style={{ bottom: insets.bottom + 24 }} className="absolute left-4 right-20">
        <View className="rounded-xl border border-border bg-card/95 px-3 py-2">
          <Text className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Colour by {mode.toLowerCase()}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {legendFor(mode, colors).map((l) => (
              <View key={l.label} className="flex-row items-center gap-1.5">
                <View style={{ backgroundColor: l.color }} className="h-2.5 w-2.5 rounded-full" />
                <Text className="text-[11px] text-muted-foreground">{l.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      <MapInspector
        asset={selected}
        open={selected !== null}
        workOrders={selected ? workOrdersForAsset(selected.id) : []}
        onClose={() => setSelectedId(null)}
        onOpenPassport={(id) => {
          setSelectedId(null)
          router.push(`/asset/${id}`)
        }}
        onRaise={(id) => {
          setSelectedId(null)
          router.push(`/scan?asset=${id}`)
        }}
      />
    </View>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={
        active
          ? 'rounded-full border border-primary bg-primary/15 px-2.5 py-1 active:opacity-80'
          : 'rounded-full border border-border px-2.5 py-1 active:opacity-80'
      }
    >
      <Text
        className={active ? 'text-[11px] font-semibold text-primary' : 'text-[11px] text-muted-foreground'}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function MapButton({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-card active:bg-muted"
    >
      {children}
    </Pressable>
  )
}

function legendFor(mode: ColourMode, colors: ReturnType<typeof useThemeColors>) {
  const ramp = [colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5]
  switch (mode) {
    case 'Status':
      return [
        { label: 'Active / Leased', color: colors.chart1 },
        { label: 'Vacant', color: colors.chart3 },
        { label: 'Maintenance / Idle', color: colors.destructive },
      ]
    case 'Condition':
      return CONDITIONS.map((c, i) => ({
        label: c,
        color: i >= 3 ? colors.destructive : ramp[i] ?? colors.chart1,
      }))
    case 'Criticality':
      return [
        { label: 'Critical', color: colors.destructive },
        { label: 'High', color: colors.chart3 },
        { label: 'Medium / Low', color: colors.chart2 },
      ]
    default:
      return ASSET_CATEGORIES.map((c, i) => ({ label: c, color: ramp[i % ramp.length] }))
  }
}
