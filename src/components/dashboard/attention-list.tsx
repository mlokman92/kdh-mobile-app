/**
 * A single prioritised feed mixing the three things that actually need a
 * decision today: breached SLAs, critical-condition assets and insurance about
 * to lapse. Each row deep-links to the screen that can resolve it.
 */

import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { AlertTriangle, ChevronRight, ShieldAlert, Sparkles, Wrench } from 'lucide-react-native'

import { Card, EmptyState } from '@/components/ui'
import { daysUntil, formatMYRCompact } from '@/lib/format'
import { useThemeColors } from '@/lib/theme'
import type { Asset, CopilotAlert, WorkOrder } from '@/lib/types'

type Kind = 'sla' | 'condition' | 'insurance' | 'alert'

interface Item {
  id: string
  kind: Kind
  title: string
  detail: string
  rank: number
  onPress: () => void
}

export interface AttentionListProps {
  assets: Asset[]
  workOrders: WorkOrder[]
  alerts: CopilotAlert[]
  onOpenAsset: (id: string) => void
  onOpenTasks: () => void
  onOpenCopilot: () => void
}

export function AttentionList({
  assets,
  workOrders,
  alerts,
  onOpenAsset,
  onOpenTasks,
  onOpenCopilot,
}: AttentionListProps) {
  const colors = useThemeColors()

  const items = useMemo<Item[]>(() => {
    const out: Item[] = []

    for (const w of workOrders) {
      if (w.status === 'Closed' || w.status === 'Cancelled') continue
      if (w.slaStatus !== 'Breached') continue
      out.push({
        id: `sla-${w.id}`,
        kind: 'sla',
        title: w.title,
        detail: `${w.code} · ${w.assetName}`,
        rank: 0,
        onPress: onOpenTasks,
      })
    }

    for (const a of assets) {
      if (a.condition !== 'Critical') continue
      out.push({
        id: `cond-${a.id}`,
        kind: 'condition',
        title: `${a.name} is in critical condition`,
        detail: `${a.code} · score ${a.conditionScore} · ${a.town}`,
        rank: 1,
        onPress: () => onOpenAsset(a.id),
      })
    }

    for (const a of assets) {
      const days = daysUntil(a.insuranceExpiry)
      if (!Number.isFinite(days) || days > 60 || days < 0) continue
      out.push({
        id: `ins-${a.id}`,
        kind: 'insurance',
        title: `Insurance lapses in ${days} day${days === 1 ? '' : 's'}`,
        detail: `${a.name} · ${a.sumInsured ? formatMYRCompact(a.sumInsured) + ' insured' : a.code}`,
        rank: 2,
        onPress: () => onOpenAsset(a.id),
      })
    }

    for (const al of alerts) {
      if (al.severity !== 'critical' || al.acknowledged || al.dismissed) continue
      out.push({
        id: `alert-${al.id}`,
        kind: 'alert',
        title: al.title,
        detail: al.assetName ?? 'Copilot insight',
        rank: 0,
        onPress: onOpenCopilot,
      })
    }

    return out.sort((a, b) => a.rank - b.rank).slice(0, 6)
  }, [assets, workOrders, alerts, onOpenAsset, onOpenTasks, onOpenCopilot])

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing needs attention"
        description="No breached SLAs, critical assets or lapsing policies right now."
        icon={(c) => <ShieldAlert size={26} color={c} />}
      />
    )
  }

  return (
    <Card>
      {items.map((item, i) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          onPress={item.onPress}
          className={
            i === 0
              ? 'min-h-[44px] flex-row items-center gap-3 p-3 active:bg-muted'
              : 'min-h-[44px] flex-row items-center gap-3 border-t border-border p-3 active:bg-muted'
          }
        >
          <View className={iconWrap(item.kind)}>
            <KindIcon kind={item.kind} colors={colors} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
              {item.title}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
              {item.detail}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.mutedForeground} />
        </Pressable>
      ))}
    </Card>
  )
}

function iconWrap(kind: Kind): string {
  const base = 'h-8 w-8 items-center justify-center rounded-lg '
  if (kind === 'condition' || kind === 'sla') return base + 'bg-destructive/12'
  if (kind === 'alert') return base + 'bg-destructive/12'
  return base + 'bg-primary/12'
}

function KindIcon({ kind, colors }: { kind: Kind; colors: ReturnType<typeof useThemeColors> }) {
  const danger = colors.destructive
  switch (kind) {
    case 'sla':
      return <Wrench size={15} color={danger} />
    case 'condition':
      return <AlertTriangle size={15} color={danger} />
    case 'alert':
      return <Sparkles size={15} color={danger} />
    default:
      return <ShieldAlert size={15} color={colors.primary} />
  }
}
