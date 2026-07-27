/** Work order detail — SLA ring, interactive checklist, history timeline. */

import { Pressable, ScrollView, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { Check, ChevronRight, Clock, Wrench } from 'lucide-react-native'

import { BottomSheet, Button, Separator, StatusBadge } from '@/components/ui'
import { readSla, nextStatus, nextStatusVerb, isFinished, checklistDone } from '@/components/tasks/sla'
import { useTick } from '@/components/tasks/tick'
import { formatDateTime, formatMYR, formatRelative } from '@/lib/format'
import { useThemeColors } from '@/lib/theme'
import { useAppStore } from '@/store/app-store'
import type { WorkOrder } from '@/lib/types'

const RING = 92
const RING_STROKE = 9
const RING_R = (RING - RING_STROKE) / 2
const RING_C = 2 * Math.PI * RING_R

export interface TaskSheetProps {
  wo: WorkOrder | null
  open: boolean
  onClose: () => void
  onOpenAsset: (assetId: string) => void
}

export function TaskSheet({ wo, open, onClose, onOpenAsset }: TaskSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={wo?.code} description={wo?.title}>
      {wo ? <TaskSheetBody wo={wo} onOpenAsset={onOpenAsset} /> : null}
    </BottomSheet>
  )
}

function TaskSheetBody({ wo, onOpenAsset }: { wo: WorkOrder; onOpenAsset: (id: string) => void }) {
  const colors = useThemeColors()
  const nowMs = useTick()
  const { setWorkOrderStatus, completeChecklistItem } = useAppStore()

  const sla = readSla(wo, nowMs)
  const next = nextStatus(wo.status)
  const verb = nextStatusVerb(wo.status)
  const done = checklistDone(wo)

  const ringColor =
    sla.tone === 'breach' || sla.tone === 'risk' ? colors.destructive : colors.primary
  const dash = (Math.min(100, sla.elapsedPct) / 100) * RING_C

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* ---- SLA ring ---- */}
      <View className="flex-row items-center gap-4">
        <View style={{ width: RING, height: RING }}>
          <Svg width={RING} height={RING}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RING_R}
              stroke={colors.muted}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RING_R}
              stroke={ringColor}
              strokeWidth={RING_STROKE}
              strokeDasharray={`${dash} ${RING_C - dash}`}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <Text
              className={
                sla.tone === 'breach' || sla.tone === 'risk'
                  ? 'text-sm font-bold text-destructive'
                  : 'text-sm font-bold text-foreground'
              }
            >
              {sla.clock}
            </Text>
            <Text className="text-[9px] text-muted-foreground">{sla.caption}</Text>
          </View>
        </View>

        <View className="flex-1 gap-2">
          <View className="flex-row flex-wrap gap-1.5">
            <StatusBadge status={wo.status} />
            <StatusBadge status={wo.priority} label={wo.priority.split(' - ')[0]} />
            <StatusBadge status={sla.status} />
          </View>
          <Row label="Type" value={wo.type} />
          <Row label="Assigned to" value={wo.assignedTo} />
          <Row label="SLA" value={`${wo.slaHours}h · due ${formatDateTime(wo.slaDueAt)}`} />
        </View>
      </View>

      <Separator className="my-4" />

      {/* ---- Asset context ---- */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${wo.assetName}`}
        onPress={() => onOpenAsset(wo.assetId)}
        className="min-h-[44px] flex-row items-center gap-3 rounded-lg border border-border bg-card p-3 active:bg-muted"
      >
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/12">
          <Wrench size={16} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {wo.assetName}
          </Text>
          <Text className="font-mono text-[11px] text-muted-foreground">
            {wo.assetCode} · {wo.zone.replace(/^Zon\s+/, '')}
          </Text>
        </View>
        <ChevronRight size={16} color={colors.mutedForeground} />
      </Pressable>

      {/* ---- Description ---- */}
      <Text className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Description
      </Text>
      <Text className="mt-1.5 text-sm leading-5 text-foreground">{wo.description}</Text>

      {/* ---- Checklist ---- */}
      {wo.checklist.length > 0 ? (
        <>
          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Checklist
            </Text>
            <Text className="text-[11px] text-muted-foreground">
              {done}/{wo.checklist.length} done
            </Text>
          </View>
          <View className="mt-2 overflow-hidden rounded-lg border border-border">
            {wo.checklist.map((item, i) => (
              <Pressable
                key={item.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.done }}
                accessibilityLabel={item.label}
                onPress={() => completeChecklistItem(wo.id, item.id, !item.done)}
                className={
                  i === 0
                    ? 'min-h-[44px] flex-row items-center gap-3 bg-card p-3 active:bg-muted'
                    : 'min-h-[44px] flex-row items-center gap-3 border-t border-border bg-card p-3 active:bg-muted'
                }
              >
                <View
                  className={
                    item.done
                      ? 'h-5 w-5 items-center justify-center rounded border border-primary bg-primary'
                      : 'h-5 w-5 items-center justify-center rounded border border-border'
                  }
                >
                  {item.done ? <Check size={13} color={colors.primaryForeground} /> : null}
                </View>
                <Text
                  className={
                    item.done
                      ? 'flex-1 text-sm text-muted-foreground line-through'
                      : 'flex-1 text-sm text-foreground'
                  }
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {/* ---- Cost ---- */}
      <View className="mt-5 flex-row gap-3">
        <CostTile label="Estimated" value={formatMYR(wo.estimatedCost)} />
        <CostTile label="Actual" value={wo.actualCost != null ? formatMYR(wo.actualCost) : '—'} />
      </View>

      {/* ---- History ---- */}
      <Text className="mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        History
      </Text>
      <View className="mt-2">
        {wo.history.map((h, i) => (
          <View key={`${h.at}-${i}`} className="flex-row gap-3">
            <View className="items-center">
              <View className="mt-1 h-2 w-2 rounded-full bg-primary" />
              {i < wo.history.length - 1 ? <View className="w-px flex-1 bg-border" /> : null}
            </View>
            <View className="flex-1 pb-4">
              <Text className="text-sm font-medium text-foreground">{h.action}</Text>
              <Text className="text-[11px] text-muted-foreground">
                {h.actor} · {formatRelative(h.at, new Date(nowMs))}
              </Text>
              {h.note ? (
                <Text className="mt-0.5 text-xs text-muted-foreground">{h.note}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {/* ---- Actions ---- */}
      {!isFinished(wo.status) ? (
        <View className="mt-2 gap-2">
          {next && verb ? (
            <Button title={verb} onPress={() => setWorkOrderStatus(wo.id, next)} />
          ) : null}
          <View className="flex-row gap-2">
            {wo.status !== 'On Hold' ? (
              <Button
                className="flex-1"
                variant="outline"
                title="Put on hold"
                onPress={() => setWorkOrderStatus(wo.id, 'On Hold')}
              />
            ) : null}
            <Button
              className="flex-1"
              variant="destructive"
              title="Cancel"
              onPress={() => setWorkOrderStatus(wo.id, 'Cancelled')}
            />
          </View>
        </View>
      ) : (
        <View className="mt-2 flex-row items-center justify-center gap-2 rounded-lg bg-primary/10 p-3">
          <Clock size={14} color={colors.primary} />
          <Text className="text-sm font-semibold text-primary">
            {wo.status} · {formatDateTime(wo.completedAt)}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-[11px] text-muted-foreground">{label}</Text>
      <Text className="flex-1 text-right text-[11px] font-medium text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

function CostTile({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-lg border border-border bg-card p-3">
      <Text className="text-[11px] text-muted-foreground">{label}</Text>
      <Text className="mt-0.5 text-sm font-bold text-foreground">{value}</Text>
    </View>
  )
}
