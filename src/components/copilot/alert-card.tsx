/** One Copilot insight: observation, recommendation, confidence, citations. */

import { Pressable, Text, View } from 'react-native'
import {
  AlertOctagon,
  AlertTriangle,
  ChevronRight,
  Info,
  Lightbulb,
  TrendingUp,
  Undo2,
} from 'lucide-react-native'

import { Button, Card, Progress } from '@/components/ui'
import { formatMYRCompact, formatRelative } from '@/lib/format'
import { useThemeColors } from '@/lib/theme'
import type { AlertCategory, AlertSeverity, CopilotAlert } from '@/lib/types'

/** Categories where "raise a job" is the natural next step. */
const MAINTENANCE_CATEGORIES = new Set<AlertCategory>([
  'Maintenance Economics',
  'Compliance Risk',
  'Utilisation',
  'Energy & ESG',
])

export interface AlertCardProps {
  alert: CopilotAlert
  onAcknowledge: () => void
  onDismiss: () => void
  onOpenAsset: (id: string) => void
  onRaise: (id: string) => void
}

export function AlertCard({
  alert,
  onAcknowledge,
  onDismiss,
  onOpenAsset,
  onRaise,
}: AlertCardProps) {
  const colors = useThemeColors()
  const handled = alert.acknowledged || alert.dismissed
  const positive = alert.severity === 'opportunity'

  return (
    <Card className={handled ? 'opacity-60' : undefined}>
      {/* Severity rail */}
      <View className="flex-row">
        <View className={rail(alert.severity)} />

        <View className="flex-1 p-3">
          <View className="flex-row items-start gap-2">
            <View className={iconWrap(alert.severity)}>
              <SeverityIcon severity={alert.severity} colors={colors} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {alert.category}
                </Text>
                <Text className="text-[10px] text-muted-foreground">
                  {formatRelative(alert.raisedAt)}
                </Text>
              </View>
              <Text className="mt-0.5 text-sm font-bold text-foreground" numberOfLines={3}>
                {alert.title}
              </Text>
            </View>
          </View>

          {/* Insight */}
          <Text className="mt-2 text-xs leading-5 text-muted-foreground">{alert.insight}</Text>

          {/* Recommendation */}
          <View className="mt-3 flex-row gap-2 rounded-lg bg-primary/8 p-2.5">
            <Lightbulb size={14} color={colors.primary} />
            <Text className="flex-1 text-xs leading-5 text-foreground">{alert.recommendation}</Text>
          </View>

          {/* Value impact */}
          {alert.valueImpact != null ? (
            <View className="mt-3 flex-row items-center gap-2">
              <View
                className={
                  positive
                    ? 'flex-row items-center gap-1 rounded-full bg-primary/12 px-2 py-1'
                    : 'flex-row items-center gap-1 rounded-full bg-destructive/12 px-2 py-1'
                }
              >
                <TrendingUp size={11} color={positive ? colors.primary : colors.destructive} />
                <Text
                  className={
                    positive
                      ? 'text-[11px] font-bold text-primary'
                      : 'text-[11px] font-bold text-destructive'
                  }
                >
                  {formatMYRCompact(Math.abs(alert.valueImpact))}
                </Text>
              </View>
              <Text className="text-[11px] text-muted-foreground">
                {positive ? 'revenue opportunity' : 'cost exposure'}
              </Text>
            </View>
          ) : null}

          {/* Confidence */}
          <View className="mt-3 gap-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] text-muted-foreground">Model confidence</Text>
              <Text className="text-[10px] font-bold text-foreground">{alert.confidence}%</Text>
            </View>
            <Progress value={alert.confidence} height={4} tone="primary" />
          </View>

          {/* Citations — the auditability story */}
          <View className="mt-3 flex-row flex-wrap gap-1.5">
            {alert.sources.map((s) => (
              <View key={s} className="rounded bg-muted px-1.5 py-0.5">
                <Text className="text-[10px] text-muted-foreground">{s}</Text>
              </View>
            ))}
          </View>

          {/* Linked asset */}
          {alert.assetId && alert.assetName ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${alert.assetName}`}
              onPress={() => onOpenAsset(alert.assetId as string)}
              className="mt-3 min-h-[44px] flex-row items-center gap-2 rounded-lg border border-border p-2.5 active:bg-muted"
            >
              <Text className="flex-1 text-xs font-medium text-foreground" numberOfLines={1}>
                {alert.assetName}
              </Text>
              <ChevronRight size={14} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row gap-2 border-t border-border p-2">
        {handled ? (
          <Button
            className="flex-1"
            size="sm"
            variant="ghost"
            title={alert.dismissed ? 'Restore' : 'Acknowledged'}
            disabled={alert.acknowledged && !alert.dismissed}
            onPress={onAcknowledge}
            leftIcon={alert.dismissed ? (c) => <Undo2 size={13} color={c} /> : undefined}
          />
        ) : (
          <>
            <Button className="flex-1" size="sm" title="Acknowledge" onPress={onAcknowledge} />
            {alert.assetId && MAINTENANCE_CATEGORIES.has(alert.category) ? (
              <Button
                className="flex-1"
                size="sm"
                variant="outline"
                title="Raise job"
                onPress={() => onRaise(alert.assetId as string)}
              />
            ) : null}
            <Button size="sm" variant="ghost" title="Dismiss" onPress={onDismiss} />
          </>
        )}
      </View>
    </Card>
  )
}

function rail(severity: AlertSeverity): string {
  const base = 'w-1 '
  switch (severity) {
    case 'critical':
      return base + 'bg-destructive'
    case 'warning':
      return base + 'bg-destructive/50'
    case 'opportunity':
      return base + 'bg-primary'
    default:
      return base + 'bg-border'
  }
}

function iconWrap(severity: AlertSeverity): string {
  const base = 'h-8 w-8 items-center justify-center rounded-lg '
  if (severity === 'critical' || severity === 'warning') return base + 'bg-destructive/12'
  if (severity === 'opportunity') return base + 'bg-primary/12'
  return base + 'bg-muted'
}

function SeverityIcon({
  severity,
  colors,
}: {
  severity: AlertSeverity
  colors: ReturnType<typeof useThemeColors>
}) {
  switch (severity) {
    case 'critical':
      return <AlertOctagon size={15} color={colors.destructive} />
    case 'warning':
      return <AlertTriangle size={15} color={colors.destructive} />
    case 'opportunity':
      return <TrendingUp size={15} color={colors.primary} />
    default:
      return <Info size={15} color={colors.mutedForeground} />
  }
}
