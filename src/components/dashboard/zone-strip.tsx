/** Horizontally scrolling per-zone roll-up across the six KEJORA zones. */

import { useMemo } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { Card, Progress } from '@/components/ui'
import { formatMYRCompact } from '@/lib/format'
import { ZONES, type Asset, type WorkOrder, type Zone } from '@/lib/types'

interface Row {
  zone: Zone
  short: string
  assets: number
  value: number
  openWorkOrders: number
  avgCondition: number
}

/** "Zon Desaru–Penawar" -> "Desaru–Penawar" */
function shortZone(zone: string): string {
  return zone.replace(/^Zon\s+/, '')
}

export function ZoneStrip({ assets, workOrders }: { assets: Asset[]; workOrders: WorkOrder[] }) {
  const rows = useMemo<Row[]>(() => {
    return ZONES.map((zone) => {
      const inZone = assets.filter((a) => a.zone === zone)
      const open = workOrders.filter(
        (w) => w.zone === zone && w.status !== 'Closed' && w.status !== 'Cancelled',
      ).length
      const value = inZone.reduce((s, a) => s + a.currentValue, 0)
      const avgCondition =
        inZone.length > 0 ? inZone.reduce((s, a) => s + a.conditionScore, 0) / inZone.length : 0
      return { zone, short: shortZone(zone), assets: inZone.length, value, openWorkOrders: open, avgCondition }
    })
  }, [assets, workOrders])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      {rows.map((r) => (
        <Card key={r.zone} className="w-[190px] p-3">
          <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
            {r.short}
          </Text>
          <Text className="mt-0.5 text-[11px] text-muted-foreground">{r.assets} assets</Text>

          <Text className="mt-3 text-lg font-bold text-foreground">{formatMYRCompact(r.value)}</Text>
          <Text className="text-[11px] text-muted-foreground">portfolio value</Text>

          <View className="mt-3 gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] text-muted-foreground">Avg condition</Text>
              <Text className="text-[11px] font-semibold text-foreground">
                {r.avgCondition.toFixed(0)}
              </Text>
            </View>
            <Progress
              value={r.avgCondition}
              height={5}
              tone={r.avgCondition >= 75 ? 'primary' : r.avgCondition >= 60 ? 'warning' : 'danger'}
            />
          </View>

          <View className="mt-3 flex-row items-center justify-between border-t border-border pt-2">
            <Text className="text-[11px] text-muted-foreground">Open work orders</Text>
            <Text
              className={
                r.openWorkOrders > 8
                  ? 'text-xs font-bold text-destructive'
                  : 'text-xs font-bold text-foreground'
              }
            >
              {r.openWorkOrders}
            </Text>
          </View>
        </Card>
      ))}
    </ScrollView>
  )
}
