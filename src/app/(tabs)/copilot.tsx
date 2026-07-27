/**
 * Screen 6 — AI Copilot alerts.
 *
 * Every figure on this screen, including the "Ask Copilot" answers, is computed
 * from the store. Nothing is a canned string with a hardcoded number in it.
 */

import { useMemo, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { MessageSquare, ShieldCheck, Sparkles } from 'lucide-react-native'

import { Button, EmptyState, ScreenHeader } from '@/components/ui'
import { AlertCard } from '@/components/copilot/alert-card'
import { AskSheet } from '@/components/copilot/ask-sheet'
import { formatMYRCompact } from '@/lib/format'
import { useThemeColors } from '@/lib/theme'
import { useAppStore } from '@/store/app-store'
import { ALERT_SEVERITIES, type AlertSeverity, type CopilotAlert } from '@/lib/types'

const FILTERS = ['All', ...ALERT_SEVERITIES] as const
type Filter = (typeof FILTERS)[number]

type Row =
  | { type: 'header'; key: string; label: string; count: number }
  | { type: 'alert'; key: string; alert: CopilotAlert }

export default function CopilotScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const store = useAppStore()
  const { alerts, acknowledgeAlert, dismissAlert } = store

  const [filter, setFilter] = useState<Filter>('All')
  const [asking, setAsking] = useState(false)

  const counts = useMemo(() => {
    const open = alerts.filter((a) => !a.acknowledged && !a.dismissed)
    const bySeverity = new Map<AlertSeverity, number>()
    for (const s of ALERT_SEVERITIES) bySeverity.set(s, 0)
    for (const a of open) bySeverity.set(a.severity, (bySeverity.get(a.severity) ?? 0) + 1)
    const valueAtStake = open.reduce((sum, a) => sum + Math.abs(a.valueImpact ?? 0), 0)
    return { open: open.length, bySeverity, valueAtStake }
  }, [alerts])

  const rows = useMemo<Row[]>(() => {
    const match = (a: CopilotAlert) => filter === 'All' || a.severity === filter

    const open = alerts.filter((a) => !a.acknowledged && !a.dismissed && match(a))
    const acked = alerts.filter((a) => a.acknowledged && !a.dismissed && match(a))
    const dropped = alerts.filter((a) => a.dismissed && match(a))

    const severityRank: Record<AlertSeverity, number> = {
      critical: 0,
      warning: 1,
      opportunity: 2,
      info: 3,
    }
    open.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])

    const out: Row[] = []
    if (open.length > 0) {
      out.push({ type: 'header', key: 'h-open', label: 'Needs a decision', count: open.length })
      for (const a of open) out.push({ type: 'alert', key: a.id, alert: a })
    }
    if (acked.length > 0) {
      out.push({ type: 'header', key: 'h-ack', label: 'Acknowledged', count: acked.length })
      for (const a of acked) out.push({ type: 'alert', key: a.id, alert: a })
    }
    if (dropped.length > 0) {
      out.push({ type: 'header', key: 'h-dis', label: 'Dismissed', count: dropped.length })
      for (const a of dropped) out.push({ type: 'alert', key: a.id, alert: a })
    }
    return out
  }, [alerts, filter])

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="AI Copilot"
        subtitle="Proactive insights across authorised asset data"
        right={
          <View className="flex-row items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-1">
            <ShieldCheck size={12} color={colors.primary} />
            <Text className="text-[10px] font-bold text-primary">SECURE</Text>
          </View>
        }
      >
        {/* Value band */}
        <View className="mt-3 flex-row gap-2">
          <Band label="Open insights" value={String(counts.open)} />
          <Band
            label="Value at stake"
            value={formatMYRCompact(counts.valueAtStake)}
            emphasis
          />
          <Band
            label="Critical"
            value={String(counts.bySeverity.get('critical') ?? 0)}
            danger={(counts.bySeverity.get('critical') ?? 0) > 0}
          />
        </View>

        {/* Severity filters */}
        <View className="mt-3 flex-row flex-wrap gap-2">
          {FILTERS.map((f) => {
            const on = filter === f
            const n = f === 'All' ? counts.open : (counts.bySeverity.get(f as AlertSeverity) ?? 0)
            return (
              <Pressable
                key={f}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(f)}
                className={
                  on
                    ? 'flex-row items-center gap-1.5 rounded-full border border-primary bg-primary/15 px-3 py-1.5 active:opacity-80'
                    : 'flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 active:opacity-80'
                }
              >
                <Text
                  className={
                    on ? 'text-xs font-semibold capitalize text-primary' : 'text-xs font-medium capitalize text-muted-foreground'
                  }
                >
                  {f}
                </Text>
                <Text className="text-[10px] font-bold text-muted-foreground">{n}</Text>
              </Pressable>
            )
          })}
        </View>
      </ScreenHeader>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 96,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="You're all caught up"
            description="No open insights match this filter. The Copilot will surface new ones as data changes."
            icon={(c) => <Sparkles size={26} color={c} />}
          />
        }
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <View className="flex-row items-center gap-2 pt-2">
              <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {item.label}
              </Text>
              <View className="rounded-full bg-muted px-1.5">
                <Text className="text-[10px] font-bold text-muted-foreground">{item.count}</Text>
              </View>
              <View className="h-px flex-1 bg-border" />
            </View>
          ) : (
            <AlertCard
              alert={item.alert}
              onAcknowledge={() => acknowledgeAlert(item.alert.id)}
              onDismiss={() => dismissAlert(item.alert.id)}
              onOpenAsset={(id) => router.push(`/asset/${id}`)}
              onRaise={(id) => router.push(`/scan?asset=${id}`)}
            />
          )
        }
      />

      {/* Ask Copilot */}
      <View style={{ bottom: insets.bottom + 20 }} className="absolute left-4 right-4">
        <Button
          title="Ask Copilot"
          onPress={() => setAsking(true)}
          leftIcon={(c) => <MessageSquare size={16} color={c} />}
        />
      </View>

      <AskSheet open={asking} onClose={() => setAsking(false)} />
    </View>
  )
}

function Band({
  label,
  value,
  emphasis,
  danger,
}: {
  label: string
  value: string
  emphasis?: boolean
  danger?: boolean
}) {
  return (
    <View
      className={
        emphasis
          ? 'flex-1 rounded-lg border border-primary/40 bg-primary/10 p-2.5'
          : 'flex-1 rounded-lg border border-border bg-card p-2.5'
      }
    >
      <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text
        className={
          danger
            ? 'mt-0.5 text-base font-bold text-destructive'
            : emphasis
              ? 'mt-0.5 text-base font-bold text-primary'
              : 'mt-0.5 text-base font-bold text-foreground'
        }
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )
}
