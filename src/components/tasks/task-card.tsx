/**
 * A work order row. The SLA pill subscribes to the shared tick on its own, so a
 * countdown update never re-renders the whole card.
 */

import { Pressable, Text, View } from 'react-native'
import { MapPin } from 'lucide-react-native'

import { Avatar, Button, Card, Progress } from '@/components/ui'
import { SlaPill } from '@/components/tasks/sla-pill'
import {
  PRIORITY_SHORT,
  TYPE_ICON,
  checklistDone,
  checklistPct,
  isFinished,
  nextStatus,
  nextStatusVerb,
} from '@/components/tasks/sla'
import { useThemeColors } from '@/lib/theme'
import type { WorkOrder, WorkOrderStatus } from '@/lib/types'

export interface TaskCardProps {
  wo: WorkOrder
  onPress: () => void
  onAdvance: (next: WorkOrderStatus) => void
  onHold: () => void
}

export function TaskCard({ wo, onPress, onAdvance, onHold }: TaskCardProps) {
  const colors = useThemeColors()
  const TypeIcon = TYPE_ICON[wo.type]
  const next = nextStatus(wo.status)
  const verb = nextStatusVerb(wo.status)
  const done = checklistDone(wo)
  const pct = checklistPct(wo)
  const finished = isFinished(wo.status)

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${wo.code}: ${wo.title}`}
        onPress={onPress}
        className="p-3 active:bg-muted"
      >
        <View className="flex-row items-start gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/12">
            <TypeIcon size={16} color={colors.primary} />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-mono text-[11px] text-muted-foreground">{wo.code}</Text>
              <View className={priorityChip(wo.priority)}>
                <Text className={priorityText(wo.priority)}>{PRIORITY_SHORT[wo.priority]}</Text>
              </View>
            </View>

            <Text className="mt-1 text-sm font-semibold text-foreground" numberOfLines={2}>
              {wo.title}
            </Text>

            <View className="mt-1 flex-row items-center gap-1">
              <MapPin size={11} color={colors.mutedForeground} />
              <Text className="flex-1 text-xs text-muted-foreground" numberOfLines={1}>
                {wo.assetName}
              </Text>
            </View>
          </View>

          <Avatar name={wo.assignedTo} size="sm" />
        </View>

        <View className="mt-3 flex-row items-center gap-2">
          <SlaPill wo={wo} />
          <View className="flex-1" />
          {wo.checklist.length > 0 ? (
            <Text className="text-[11px] text-muted-foreground">
              {done}/{wo.checklist.length} steps
            </Text>
          ) : null}
        </View>

        {wo.checklist.length > 0 ? (
          <Progress className="mt-2" value={pct} height={4} tone={pct === 100 ? 'success' : 'primary'} />
        ) : null}
      </Pressable>

      {/* Explicit buttons, so the demo never depends on a swipe landing. */}
      {!finished && (next || wo.status !== 'On Hold') ? (
        <View className="flex-row gap-2 border-t border-border p-2">
          {next && verb ? (
            <Button
              className="flex-1"
              size="sm"
              title={verb}
              onPress={() => onAdvance(next)}
              accessibilityLabel={`${verb} ${wo.code}`}
            />
          ) : null}
          {wo.status !== 'On Hold' ? (
            <Button
              className="flex-1"
              size="sm"
              variant="outline"
              title="Hold"
              onPress={onHold}
              accessibilityLabel={`Put ${wo.code} on hold`}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  )
}

function priorityChip(priority: WorkOrder['priority']): string {
  const base = 'rounded px-1.5 py-0.5 '
  if (priority === 'P1 - Critical') return base + 'bg-destructive/15'
  if (priority === 'P2 - High') return base + 'bg-destructive/10'
  return base + 'bg-muted'
}

function priorityText(priority: WorkOrder['priority']): string {
  const base = 'text-[10px] font-bold '
  if (priority === 'P1 - Critical' || priority === 'P2 - High') return base + 'text-destructive'
  return base + 'text-muted-foreground'
}
