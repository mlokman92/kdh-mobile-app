/**
 * Screen 1 — Dashboard overview.
 *
 * Realtime KPI and health at a glance. Everything reads from `useAppStore`, so
 * a work order raised on the Scan tab or closed on Tasks moves these numbers
 * immediately.
 */

import { useCallback, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import {
  AlertTriangle,
  Building2,
  CircleDollarSign,
  ClipboardList,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
} from 'lucide-react-native'

import { Avatar, Badge, Card, Progress, StatTile } from '@/components/ui'
import { AttentionList } from '@/components/dashboard/attention-list'
import { ConditionDonut } from '@/components/dashboard/condition-donut'
import { PortfolioHero } from '@/components/dashboard/portfolio-hero'
import { ZoneStrip } from '@/components/dashboard/zone-strip'
import { SectionHeading } from '@/components/dashboard/section-heading'
import { DEMO_USER, greetingFor, malayDay } from '@/components/dashboard/constants'
import { formatDate, formatRelative } from '@/lib/format'
import { useThemeColors, useThemeToggle } from '@/lib/theme'
import { useAppStore } from '@/store/app-store'

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { scheme, toggle } = useThemeToggle()
  const store = useAppStore()
  const { assets, workOrders, kpis, activity, alerts } = store

  const [refreshing, setRefreshing] = useState(false)
  const [syncedAt, setSyncedAt] = useState(() => new Date())

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    // No backend to hit — the pause is what makes the sync chip legible.
    setTimeout(() => {
      setSyncedAt(new Date())
      setRefreshing(false)
    }, 900)
  }, [])

  const now = new Date()
  const greeting = greetingFor(now)

  const headline = useMemo(() => {
    const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0)
    const netBookValue = assets.reduce((sum, a) => sum + a.netBookValue, 0)
    return { totalValue, netBookValue, count: assets.length }
  }, [assets])

  const openCount = store.openWorkOrders.length
  const breached = useMemo(
    () => workOrders.filter((w) => w.slaStatus === 'Breached' && w.status !== 'Closed' && w.status !== 'Cancelled'),
    [workOrders],
  )

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ---- Greeting ---- */}
        <View className="flex-row items-start justify-between gap-3 px-4">
          <View className="flex-1">
            <Text className="text-xs font-medium text-muted-foreground">
              {malayDay(now)}, {formatDate(now.toISOString())}
            </Text>
            <Text className="mt-1 text-2xl font-bold text-foreground" numberOfLines={1}>
              {greeting}, {DEMO_USER.salutation}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
              {DEMO_USER.role} · {DEMO_USER.unit}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <ThemeButton scheme={scheme} onPress={toggle} />
            <Avatar name={DEMO_USER.name} size="default" />
          </View>
        </View>

        {/* ---- Sync chip: the integration story ---- */}
        <View className="mt-3 px-4">
          <View className="flex-row items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5">
            <RefreshCw size={12} color={colors.primary} />
            <Text className="text-[11px] font-medium text-muted-foreground">
              Synced with KDH One Asset web · {formatRelative(syncedAt.toISOString(), now)}
            </Text>
          </View>
        </View>

        {/* ---- Portfolio hero ---- */}
        <View className="mt-4 px-4">
          <PortfolioHero
            totalValue={headline.totalValue}
            netBookValue={headline.netBookValue}
            assetCount={headline.count}
            trend={store.monthlyTrend}
          />
        </View>

        {/* ---- KPI grid ---- */}
        <View className="mt-5 px-4">
          <SectionHeading title="Petunjuk Utama" caption="Key performance indicators" />
          <View className="flex-row flex-wrap gap-3">
            {kpis.map((k) => (
              <StatTile
                key={k.id}
                className="min-w-[47%] flex-1"
                label={k.label}
                value={k.value}
                unit={k.unit}
                delta={k.delta}
                deltaLabel="vs last month"
                intent={k.intent}
                spark={k.spark}
                icon={(c) => <KpiIcon id={k.id} color={c} />}
              />
            ))}
          </View>
        </View>

        {/* ---- Portfolio health ---- */}
        <View className="mt-6 px-4">
          <SectionHeading title="Portfolio Health" caption="Asset condition distribution" />
          <ConditionDonut assets={assets} />
        </View>

        {/* ---- Zone performance ---- */}
        <View className="mt-6">
          <View className="px-4">
            <SectionHeading title="Zone Performance" caption="Six KEJORA operational zones" />
          </View>
          <ZoneStrip assets={assets} workOrders={workOrders} />
        </View>

        {/* ---- Attention required ---- */}
        <View className="mt-6 px-4">
          <SectionHeading
            title="Perlu Perhatian"
            caption="Attention required"
            right={
              breached.length > 0 ? (
                <Badge variant="destructive" label={`${breached.length} SLA`} />
              ) : undefined
            }
          />
          <AttentionList
            assets={assets}
            workOrders={workOrders}
            alerts={alerts}
            onOpenAsset={(id) => router.push(`/asset/${id}`)}
            onOpenTasks={() => router.push('/tasks')}
            onOpenCopilot={() => router.push('/copilot')}
          />
        </View>

        {/* ---- Recent activity ---- */}
        <View className="mt-6 px-4">
          <SectionHeading title="Aktiviti Terkini" caption="Recent activity across the portfolio" />
          <Card>
            {activity.slice(0, 8).map((item, i) => (
              <View
                key={item.id}
                className={
                  i === 0
                    ? 'flex-row items-start gap-3 p-3'
                    : 'flex-row items-start gap-3 border-t border-border p-3'
                }
              >
                <Avatar name={item.actor} size="sm" tone={item.kind === 'alert' ? 'accent' : 'primary'} />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
                    {item.action}
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={2}>
                    {item.detail}
                  </Text>
                </View>
                <Text className="text-[11px] text-muted-foreground">{formatRelative(item.at, now)}</Text>
              </View>
            ))}
          </Card>
        </View>

        {/* ---- Footer counts, so the demo can sanity-check the tabs ---- */}
        <View className="mt-5 flex-row gap-3 px-4">
          <FooterStat icon={<ClipboardList size={14} color={colors.mutedForeground} />} label="Open work orders" value={String(openCount)} />
          <FooterStat icon={<AlertTriangle size={14} color={colors.mutedForeground} />} label="Open insights" value={String(store.unacknowledgedAlerts.length)} />
        </View>
      </ScrollView>
    </View>
  )
}

function ThemeButton({ scheme, onPress }: { scheme: 'light' | 'dark'; onPress: () => void }) {
  const colors = useThemeColors()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={scheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:opacity-70"
    >
      {scheme === 'dark' ? (
        <Sun size={16} color={colors.foreground} />
      ) : (
        <Moon size={16} color={colors.foreground} />
      )}
    </Pressable>
  )
}

function KpiIcon({ id, color }: { id: string; color: string }) {
  if (id.includes('value') || id.includes('collection')) return <CircleDollarSign size={15} color={color} />
  if (id.includes('sla')) return <ShieldCheck size={15} color={color} />
  if (id.includes('work')) return <ClipboardList size={15} color={color} />
  return <Building2 size={15} color={color} />
}

function FooterStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="flex-1 flex-row items-center gap-2 p-3">
      {icon}
      <View className="flex-1">
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {label}
        </Text>
        <Text className="text-base font-bold text-foreground">{value}</Text>
      </View>
    </Card>
  )
}
