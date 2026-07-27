/**
 * The live SLA countdown. Deliberately its own component so that a tick
 * re-renders only this pill, not the card around it.
 */

import { Text, View } from 'react-native'
import { Clock } from 'lucide-react-native'

import { readSla, type SlaTone } from '@/components/tasks/sla'
import { useTick } from '@/components/tasks/tick'
import { useThemeColors } from '@/lib/theme'
import type { WorkOrder } from '@/lib/types'

export function SlaPill({ wo }: { wo: WorkOrder }) {
  const nowMs = useTick()
  const colors = useThemeColors()
  const sla = readSla(wo, nowMs)

  return (
    <View className={wrap(sla.tone)}>
      <Clock size={11} color={iconColor(sla.tone, colors)} />
      <Text className={label(sla.tone)}>{sla.text}</Text>
    </View>
  )
}

function wrap(tone: SlaTone): string {
  const base = 'flex-row items-center gap-1 rounded-full px-2 py-1 '
  switch (tone) {
    case 'breach':
      return base + 'bg-destructive/15'
    case 'risk':
      return base + 'bg-destructive/10'
    case 'met':
      return base + 'bg-primary/12'
    case 'idle':
      return base + 'bg-muted'
    default:
      return base + 'bg-primary/10'
  }
}

function label(tone: SlaTone): string {
  const base = 'text-[11px] font-bold '
  switch (tone) {
    case 'breach':
    case 'risk':
      return base + 'text-destructive'
    case 'idle':
      return base + 'text-muted-foreground'
    default:
      return base + 'text-primary'
  }
}

function iconColor(tone: SlaTone, colors: ReturnType<typeof useThemeColors>): string {
  if (tone === 'breach' || tone === 'risk') return colors.destructive
  if (tone === 'idle') return colors.mutedForeground
  return colors.primary
}
