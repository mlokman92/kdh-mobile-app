/**
 * "Ask Copilot" — a small set of questions answered by querying the store.
 *
 * There is no model behind this and no network. Each answer is computed live
 * from the same arrays the rest of the app renders, and carries a plain-English
 * note on how it was derived plus the record counts it drew from — so anything
 * quoted here can be checked against the other screens.
 */

import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react-native'

import { BottomSheet, Separator } from '@/components/ui'
import { daysUntil, formatMYRCompact, formatNumber, formatPct } from '@/lib/format'
import { useThemeColors } from '@/lib/theme'
import { useAppStore } from '@/store/app-store'
import type { Asset, WorkOrder, Zone } from '@/lib/types'

interface Answer {
  headline: string
  detail: string
  /** How the number was reached, in plain English. */
  working: string
  sources: string[]
  rows?: { label: string; value: string }[]
}

interface Question {
  id: string
  text: string
  answer: (assets: Asset[], workOrders: WorkOrder[]) => Answer
}

const LIVE = (w: WorkOrder) => w.status !== 'Closed' && w.status !== 'Cancelled'

const QUESTIONS: Question[] = [
  {
    id: 'critical-condition',
    text: 'How many assets are in critical condition?',
    answer: (assets) => {
      const critical = assets.filter((a) => a.condition === 'Critical')
      const value = critical.reduce((s, a) => s + a.currentValue, 0)
      return {
        headline: `${critical.length} assets`,
        detail: `Carrying ${formatMYRCompact(value)} of book value between them.`,
        working:
          'Counted every asset whose condition field reads "Critical", then summed their current value.',
        sources: [`${assets.length} assets`],
        rows: critical.slice(0, 5).map((a) => ({
          label: a.name,
          value: `score ${a.conditionScore}`,
        })),
      }
    },
  },
  {
    id: 'sla',
    text: 'What is our SLA compliance right now?',
    answer: (_assets, workOrders) => {
      // Only graded tickets count — cancelled and still-running ones are excluded.
      const graded = workOrders.filter(
        (w) => w.status === 'Closed' && (w.slaStatus === 'Met' || w.slaStatus === 'Breached'),
      )
      const met = graded.filter((w) => w.slaStatus === 'Met').length
      const pct = graded.length > 0 ? (met / graded.length) * 100 : 0
      return {
        headline: formatPct(pct),
        detail: `${met} of ${graded.length} closed work orders finished inside their SLA window.`,
        working:
          'Denominator is closed work orders only. Cancelled tickets and jobs still in flight are excluded, because neither has a final outcome to grade yet.',
        sources: [`${workOrders.length} work orders`],
      }
    },
  },
  {
    id: 'overdue-zone',
    text: 'Which zone has the most overdue work orders?',
    answer: (_assets, workOrders) => {
      const overdue = workOrders.filter((w) => LIVE(w) && w.slaStatus === 'Breached')
      const byZone = new Map<Zone, number>()
      for (const w of overdue) byZone.set(w.zone, (byZone.get(w.zone) ?? 0) + 1)
      const ranked = Array.from(byZone.entries()).sort((a, b) => b[1] - a[1])
      const top = ranked[0]
      return {
        headline: top ? top[0].replace(/^Zon\s+/, '') : 'None',
        detail: top
          ? `${top[1]} breached work orders, out of ${overdue.length} across the portfolio.`
          : 'No work order has breached its SLA.',
        working:
          'Filtered to work orders that are still open and already past their SLA due time, then grouped by zone.',
        sources: [`${workOrders.length} work orders`],
        rows: ranked.map(([zone, n]) => ({ label: zone.replace(/^Zon\s+/, ''), value: String(n) })),
      }
    },
  },
  {
    id: 'insurance',
    text: 'What value is at risk from expiring insurance?',
    answer: (assets) => {
      const soon = assets.filter((a) => {
        const d = daysUntil(a.insuranceExpiry)
        return Number.isFinite(d) && d >= 0 && d <= 60
      })
      const exposure = soon.reduce((s, a) => s + (a.sumInsured ?? 0), 0)
      return {
        headline: formatMYRCompact(exposure),
        detail: `${soon.length} policies lapse within 60 days.`,
        working:
          'Took every asset whose insurance expiry falls in the next 60 days and summed the sum insured on those policies.',
        sources: [`${assets.length} assets`],
        rows: soon.slice(0, 5).map((a) => ({
          label: a.name,
          value: `${daysUntil(a.insuranceExpiry)}d`,
        })),
      }
    },
  },
  {
    id: 'portfolio',
    text: 'What is the portfolio worth?',
    answer: (assets) => {
      const value = assets.reduce((s, a) => s + a.currentValue, 0)
      const nbv = assets.reduce((s, a) => s + a.netBookValue, 0)
      const byCat = new Map<string, number>()
      for (const a of assets) byCat.set(a.category, (byCat.get(a.category) ?? 0) + a.currentValue)
      return {
        headline: formatMYRCompact(value),
        detail: `Across ${formatNumber(assets.length)} assets. Net book value ${formatMYRCompact(nbv)}.`,
        working:
          'Summed the current value of every asset on the register, and separately their net book value.',
        sources: [`${assets.length} assets`],
        rows: Array.from(byCat.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cat, v]) => ({ label: cat, value: formatMYRCompact(v) })),
      }
    },
  },
  {
    id: 'workload',
    text: 'How much work is open right now?',
    answer: (_assets, workOrders) => {
      const live = workOrders.filter(LIVE)
      const breached = live.filter((w) => w.slaStatus === 'Breached').length
      const cost = live.reduce((s, w) => s + w.estimatedCost, 0)
      return {
        headline: `${live.length} open`,
        detail: `${breached} already past SLA. Estimated cost to clear: ${formatMYRCompact(cost)}.`,
        working:
          'Counted work orders not yet Closed or Cancelled, flagged those past their due time, and summed the estimated cost across them.',
        sources: [`${workOrders.length} work orders`],
      }
    },
  },
]

export function AskSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const colors = useThemeColors()
  const { assets, workOrders } = useAppStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  const active = useMemo(() => QUESTIONS.find((q) => q.id === activeId) ?? null, [activeId])
  const answer = useMemo(
    () => (active ? active.answer(assets, workOrders) : null),
    [active, assets, workOrders],
  )

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setActiveId(null)
        onClose()
      }}
      title="Ask Copilot"
      description={active ? undefined : 'Answered live from your authorised data'}
    >
      {!active ? (
        <View>
          {QUESTIONS.map((q, i) => (
            <Pressable
              key={q.id}
              accessibilityRole="button"
              accessibilityLabel={q.text}
              onPress={() => setActiveId(q.id)}
              className={
                i === 0
                  ? 'min-h-[44px] flex-row items-center gap-3 py-3 active:opacity-70'
                  : 'min-h-[44px] flex-row items-center gap-3 border-t border-border py-3 active:opacity-70'
              }
            >
              <Sparkles size={15} color={colors.primary} />
              <Text className="flex-1 text-sm text-foreground">{q.text}</Text>
              <ChevronRight size={15} color={colors.mutedForeground} />
            </Pressable>
          ))}

          <Text className="mt-4 text-[11px] leading-4 text-muted-foreground">
            KDH Copilot answers from authorised internal records only. Every figure is computed at
            the moment you ask and can be traced back to the source screens.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to questions"
            onPress={() => setActiveId(null)}
            className="min-h-[44px] flex-row items-center gap-2 active:opacity-70"
          >
            <ArrowLeft size={15} color={colors.mutedForeground} />
            <Text className="text-xs font-medium text-muted-foreground">All questions</Text>
          </Pressable>

          <Text className="mt-2 text-sm font-medium text-muted-foreground">{active.text}</Text>

          {answer ? (
            <>
              <Text className="mt-3 text-3xl font-bold text-primary">{answer.headline}</Text>
              <Text className="mt-1 text-sm leading-5 text-foreground">{answer.detail}</Text>

              {answer.rows && answer.rows.length > 0 ? (
                <View className="mt-4 overflow-hidden rounded-lg border border-border">
                  {answer.rows.map((r, i) => (
                    <View
                      key={`${r.label}-${i}`}
                      className={
                        i === 0
                          ? 'flex-row items-center justify-between gap-3 bg-card p-2.5'
                          : 'flex-row items-center justify-between gap-3 border-t border-border bg-card p-2.5'
                      }
                    >
                      <Text className="flex-1 text-xs text-foreground" numberOfLines={1}>
                        {r.label}
                      </Text>
                      <Text className="text-xs font-semibold text-foreground">{r.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Separator className="my-4" />

              <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                How this was worked out
              </Text>
              <Text className="mt-1 text-xs leading-5 text-muted-foreground">{answer.working}</Text>

              <View className="mt-3 flex-row flex-wrap gap-1.5">
                {answer.sources.map((s) => (
                  <View key={s} className="rounded bg-muted px-1.5 py-0.5">
                    <Text className="text-[10px] text-muted-foreground">{s}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      )}
    </BottomSheet>
  )
}
