/**
 * Screen 5 — Maintenance task list.
 *
 * One shared 1-second clock (TickProvider) drives every SLA countdown on
 * screen; see components/tasks/tick.tsx for why.
 */

import { useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Plus, Search, X } from 'lucide-react-native'

import { EmptyState, ScreenHeader } from '@/components/ui'
import { TaskCard } from '@/components/tasks/task-card'
import { TaskSheet } from '@/components/tasks/task-sheet'
import { TickProvider } from '@/components/tasks/tick'
import {
  PRIORITY_RANK,
  URGENCY_KEYS,
  URGENCY_LABEL,
  isFinished,
  urgencyOf,
  type UrgencyKey,
} from '@/components/tasks/sla'
import { useThemeColors } from '@/lib/theme'
import { useAppStore } from '@/store/app-store'
import type { WorkOrder } from '@/lib/types'

const FILTERS = ['All', 'Mine', 'Due today', 'Overdue', 'High priority', 'Completed'] as const
type Filter = (typeof FILTERS)[number]

/** The demo technician — "Mine" filters against this. */
const ME = 'Ganesan a/l Muthu'

type Row = { type: 'header'; key: string; label: string; count: number } | { type: 'task'; key: string; wo: WorkOrder }

export default function TasksScreen() {
  return (
    <TickProvider>
      <TasksInner />
    </TickProvider>
  )
}

function TasksInner() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { workOrders, setWorkOrderStatus } = useAppStore()

  const [filter, setFilter] = useState<Filter>('All')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const nowMs = Date.now()

  const counts = useMemo(() => {
    const live = workOrders.filter((w) => !isFinished(w.status))
    return {
      open: live.length,
      today: live.filter((w) => urgencyOf(w, nowMs) === 'today').length,
      overdue: live.filter((w) => urgencyOf(w, nowMs) === 'overdue').length,
      done: workOrders.filter((w) => w.status === 'Closed').length,
    }
    // nowMs intentionally omitted — bucket counts need not re-run every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrders])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return workOrders.filter((w) => {
      if (q) {
        const hay = `${w.code} ${w.title} ${w.assetName} ${w.assetCode}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      switch (filter) {
        case 'Mine':
          return w.assignedTo === ME && !isFinished(w.status)
        case 'Due today':
          return !isFinished(w.status) && urgencyOf(w, nowMs) === 'today'
        case 'Overdue':
          return !isFinished(w.status) && urgencyOf(w, nowMs) === 'overdue'
        case 'High priority':
          return !isFinished(w.status) && PRIORITY_RANK[w.priority] <= 1
        case 'Completed':
          return w.status === 'Closed'
        default:
          return true
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrders, filter, query])

  /** Group into urgency sections, then flatten for a single FlatList. */
  const rows = useMemo<Row[]>(() => {
    const buckets = new Map<UrgencyKey, WorkOrder[]>()
    for (const key of URGENCY_KEYS) buckets.set(key, [])
    for (const w of filtered) buckets.get(urgencyOf(w, nowMs))?.push(w)

    const out: Row[] = []
    for (const key of URGENCY_KEYS) {
      const list = buckets.get(key) ?? []
      if (list.length === 0) continue
      list.sort((a, b) => {
        const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        if (p !== 0) return p
        return new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime()
      })
      out.push({ type: 'header', key: `h-${key}`, label: URGENCY_LABEL[key], count: list.length })
      for (const wo of list) out.push({ type: 'task', key: wo.id, wo })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  const active = openId ? workOrders.find((w) => w.id === openId) ?? null : null

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Maintenance Tasks"
        subtitle={`${counts.open} open · ${counts.overdue} overdue`}
      >
        {/* Search */}
        <View className="mt-3 flex-row items-center gap-2 rounded-lg border border-border bg-card px-3">
          <Search size={15} color={colors.mutedForeground} />
          <TextInputCompat value={query} onChangeText={setQuery} />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={10}
              onPress={() => setQuery('')}
            >
              <X size={15} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        {/* Quick stats double as filters */}
        <View className="mt-3 flex-row gap-2">
          <QuickStat label="Open" value={counts.open} onPress={() => setFilter('All')} active={filter === 'All'} />
          <QuickStat label="Due today" value={counts.today} onPress={() => setFilter('Due today')} active={filter === 'Due today'} />
          <QuickStat label="Overdue" value={counts.overdue} tone="danger" onPress={() => setFilter('Overdue')} active={filter === 'Overdue'} />
          <QuickStat label="Closed" value={counts.done} onPress={() => setFilter('Completed')} active={filter === 'Completed'} />
        </View>

        {/* Filter chips */}
        <View className="mt-3 flex-row flex-wrap gap-2">
          {FILTERS.map((f) => {
            const on = filter === f
            return (
              <Pressable
                key={f}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(f)}
                className={
                  on
                    ? 'rounded-full border border-primary bg-primary/15 px-3 py-1.5 active:opacity-80'
                    : 'rounded-full border border-border bg-card px-3 py-1.5 active:opacity-80'
                }
              >
                <Text
                  className={on ? 'text-xs font-semibold text-primary' : 'text-xs font-medium text-muted-foreground'}
                >
                  {f}
                </Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              setRefreshing(true)
              setTimeout(() => setRefreshing(false), 700)
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No matching tasks"
            description="Try a different filter, or clear the search."
            actionLabel="Clear filters"
            onAction={() => {
              setFilter('All')
              setQuery('')
            }}
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
            <TaskCard
              wo={item.wo}
              onPress={() => setOpenId(item.wo.id)}
              onAdvance={(next) => setWorkOrderStatus(item.wo.id, next)}
              onHold={() => setWorkOrderStatus(item.wo.id, 'On Hold')}
            />
          )
        }
      />

      {/* Raise a work order — routes into the scan flow's manual path. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Raise a work order"
        onPress={() => router.push('/scan?manual=1')}
        style={{ bottom: insets.bottom + 24 }}
        className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-primary active:opacity-85"
      >
        <Plus size={24} color={colors.primaryForeground} />
      </Pressable>

      <TaskSheet
        wo={active}
        open={active !== null}
        onClose={() => setOpenId(null)}
        onOpenAsset={(id) => {
          setOpenId(null)
          router.push(`/asset/${id}`)
        }}
      />
    </View>
  )
}

function QuickStat({
  label,
  value,
  tone,
  active,
  onPress,
}: {
  label: string
  value: number
  tone?: 'danger'
  active?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      className={
        active
          ? 'min-h-[44px] flex-1 rounded-lg border border-primary bg-primary/10 p-2 active:opacity-80'
          : 'min-h-[44px] flex-1 rounded-lg border border-border bg-card p-2 active:opacity-80'
      }
    >
      <Text
        className={
          tone === 'danger' && value > 0
            ? 'text-base font-bold text-destructive'
            : 'text-base font-bold text-foreground'
        }
      >
        {value}
      </Text>
      <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

/** Small wrapper so the search field keeps consistent styling. */
function TextInputCompat({ value, onChangeText }: { value: string; onChangeText: (v: string) => void }) {
  const colors = useThemeColors()
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Search code, title or asset"
      placeholderTextColor={colors.mutedForeground}
      style={{ flex: 1, height: 44, color: colors.foreground, fontSize: 14 }}
    />
  )
}
