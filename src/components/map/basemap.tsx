/**
 * The South East Johor basemap, drawn as SVG.
 *
 * There is no tile server anywhere in this app — the cartography is generated
 * from the coordinates in '@/lib/geo', so the map renders identically with no
 * connectivity. Static layers are memoised because they never change.
 */

import { memo, useMemo } from 'react'
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'

import {
  ISLANDS,
  LANDMASS,
  MAP_BOUNDS,
  MAP_SIZE,
  TOWNS,
  ZONE_GEOMETRY,
  project,
  ringToPath,
} from '@/lib/geo'
import { withAlpha, type ThemeColors } from '@/lib/theme'
import type { Zone } from '@/lib/types'

export interface Pin {
  id: string
  x: number
  y: number
  color: string
  r: number
}

export interface Cluster {
  key: string
  x: number
  y: number
  count: number
}

export interface BasemapProps {
  colors: ThemeColors
  pins: Pin[]
  clusters: Cluster[]
  selectedId: string | null
  selectedZone: Zone | null
  showZones: boolean
  showTowns: boolean
  showLabels: boolean
  showGraticule: boolean
}

export const Basemap = memo(function Basemap({
  colors,
  pins,
  clusters,
  selectedId,
  selectedZone,
  showZones,
  showTowns,
  showLabels,
  showGraticule,
}: BasemapProps) {
  const landPath = useMemo(() => ringToPath(LANDMASS), [])
  const islandPaths = useMemo(() => ISLANDS.map((i) => ({ name: i.name, d: ringToPath(i.ring) })), [])
  const zonePaths = useMemo(
    () =>
      ZONE_GEOMETRY.map((z) => ({
        zone: z.zone,
        short: z.short,
        d: ringToPath(z.ring),
        label: project(z.labelAt[1], z.labelAt[0]),
      })),
    [],
  )
  const towns = useMemo(
    () => TOWNS.map((t) => ({ ...t, ...project(t.lat, t.lng) })),
    [],
  )

  const graticule = useMemo(() => {
    if (!showGraticule) return { lats: [], lngs: [] }
    const lats: { y: number; label: string }[] = []
    const lngs: { x: number; label: string }[] = []
    for (let lat = Math.ceil(MAP_BOUNDS.minLat * 4) / 4; lat <= MAP_BOUNDS.maxLat; lat += 0.25) {
      lats.push({ y: project(lat, MAP_BOUNDS.minLng).y, label: `${lat.toFixed(2)}°N` })
    }
    for (let lng = Math.ceil(MAP_BOUNDS.minLng * 4) / 4; lng <= MAP_BOUNDS.maxLng; lng += 0.25) {
      lngs.push({ x: project(MAP_BOUNDS.minLat, lng).x, label: `${lng.toFixed(2)}°E` })
    }
    return { lats, lngs }
  }, [showGraticule])

  return (
    <Svg width={MAP_SIZE.width} height={MAP_SIZE.height}>
      {/* Sea */}
      <Rect x={0} y={0} width={MAP_SIZE.width} height={MAP_SIZE.height} fill={colors.sea} />

      {/* Graticule */}
      {showGraticule ? (
        <G>
          {graticule.lats.map((l) => (
            <Line
              key={`lat-${l.label}`}
              x1={0}
              y1={l.y}
              x2={MAP_SIZE.width}
              y2={l.y}
              stroke={withAlpha(colors.mutedForeground, 0.16)}
              strokeWidth={1}
            />
          ))}
          {graticule.lngs.map((l) => (
            <Line
              key={`lng-${l.label}`}
              x1={l.x}
              y1={0}
              x2={l.x}
              y2={MAP_SIZE.height}
              stroke={withAlpha(colors.mutedForeground, 0.16)}
              strokeWidth={1}
            />
          ))}
        </G>
      ) : null}

      {/* Landmass */}
      <Path d={landPath} fill={colors.land} stroke={withAlpha(colors.mutedForeground, 0.5)} strokeWidth={1.5} />
      {islandPaths.map((i) => (
        <Path
          key={i.name}
          d={i.d}
          fill={colors.land}
          stroke={withAlpha(colors.mutedForeground, 0.45)}
          strokeWidth={1}
        />
      ))}

      {/* Zones */}
      {showZones
        ? zonePaths.map((z) => {
            const on = selectedZone === z.zone
            return (
              <G key={z.zone}>
                <Path
                  d={z.d}
                  fill={withAlpha(colors.primary, on ? 0.2 : 0.08)}
                  stroke={withAlpha(colors.primary, on ? 0.9 : 0.4)}
                  strokeWidth={on ? 2.5 : 1.5}
                />
                {showLabels ? (
                  <SvgText
                    x={z.label.x}
                    y={z.label.y}
                    fill={colors.mutedForeground}
                    fontSize={17}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {z.short}
                  </SvgText>
                ) : null}
              </G>
            )
          })
        : null}

      {/* Towns */}
      {showTowns
        ? towns.map((t) => (
            <G key={t.name}>
              <Circle
                cx={t.x}
                cy={t.y}
                r={t.kind === 'hq' ? 6 : 4}
                fill={t.kind === 'hq' ? colors.foreground : withAlpha(colors.foreground, 0.55)}
              />
              {showLabels ? (
                <SvgText
                  x={t.x + 9}
                  y={t.y + 5}
                  fill={colors.foreground}
                  fontSize={t.kind === 'hq' ? 16 : 13}
                  fontWeight={t.kind === 'hq' ? '700' : '500'}
                >
                  {t.name}
                </SvgText>
              ) : null}
            </G>
          ))
        : null}

      {/* Asset pins */}
      {pins.map((p) => (
        <Circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={p.id === selectedId ? p.r + 5 : p.r}
          fill={p.color}
          stroke={p.id === selectedId ? colors.foreground : colors.card}
          strokeWidth={p.id === selectedId ? 3 : 1.5}
          opacity={0.95}
        />
      ))}

      {/* Clusters */}
      {clusters.map((c) => (
        <G key={c.key}>
          <Circle cx={c.x} cy={c.y} r={20} fill={withAlpha(colors.primary, 0.25)} />
          <Circle cx={c.x} cy={c.y} r={14} fill={colors.primary} />
          <SvgText
            x={c.x}
            y={c.y + 5}
            fill={colors.primaryForeground}
            fontSize={14}
            fontWeight="700"
            textAnchor="middle"
          >
            {c.count}
          </SvgText>
        </G>
      ))}
    </Svg>
  )
})
