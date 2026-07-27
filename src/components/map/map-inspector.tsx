/** Bottom-sheet inspector for a tapped map pin. */

import { Text, View } from 'react-native'

import { BottomSheet, Button, Progress, StatusBadge } from '@/components/ui'
import { formatLatLng } from '@/lib/geo'
import { formatMYRCompact, formatPct } from '@/lib/format'
import type { Asset, WorkOrder } from '@/lib/types'

export interface MapInspectorProps {
  asset: Asset | null
  workOrders: WorkOrder[]
  open: boolean
  onClose: () => void
  onOpenPassport: (id: string) => void
  onRaise: (id: string) => void
}

export function MapInspector({
  asset,
  workOrders,
  open,
  onClose,
  onOpenPassport,
  onRaise,
}: MapInspectorProps) {
  const openCount = workOrders.filter((w) => w.status !== 'Closed' && w.status !== 'Cancelled').length

  return (
    <BottomSheet open={open} onClose={onClose} maxHeightRatio={0.6}>
      {asset ? (
        <View>
          <Text className="font-mono text-[11px] text-muted-foreground">{asset.code}</Text>
          <Text className="mt-0.5 text-lg font-bold text-foreground">{asset.name}</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {asset.town}, {asset.district} · {asset.zone.replace(/^Zon\s+/, '')}
          </Text>

          <View className="mt-3 flex-row flex-wrap gap-1.5">
            <StatusBadge status={asset.status} />
            <StatusBadge status={asset.condition} />
            <StatusBadge status={asset.criticality} />
          </View>

          <View className="mt-4 flex-row gap-3">
            <Metric label="Current value" value={formatMYRCompact(asset.currentValue)} />
            <Metric label="Utilisation" value={formatPct(asset.utilisationRate, 0)} />
            <Metric label="Open jobs" value={String(openCount)} />
          </View>

          <View className="mt-4 gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] text-muted-foreground">Condition score</Text>
              <Text className="text-[11px] font-semibold text-foreground">{asset.conditionScore}</Text>
            </View>
            <Progress
              value={asset.conditionScore}
              height={6}
              tone={asset.conditionScore >= 75 ? 'primary' : asset.conditionScore >= 60 ? 'warning' : 'danger'}
            />
          </View>

          <Text className="mt-3 font-mono text-[11px] text-muted-foreground">
            {formatLatLng(asset.lat, asset.lng)}
          </Text>

          <View className="mt-5 flex-row gap-2">
            <Button
              className="flex-1"
              title="Open passport"
              onPress={() => onOpenPassport(asset.id)}
            />
            <Button
              className="flex-1"
              variant="outline"
              title="Raise work order"
              onPress={() => onRaise(asset.id)}
            />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-lg border border-border bg-card p-2.5">
      <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text className="mt-0.5 text-sm font-bold text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}
