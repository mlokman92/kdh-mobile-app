/**
 * SectionHeading — the small title bar above each dashboard block.
 *
 * RN has no cascading text styles, so the title, the caption and the trailing
 * action each carry their own className.
 */

import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'

import { cn } from '@/lib/cn'
import { useThemeColors } from '@/lib/theme'

export interface SectionHeadingProps {
  title: string
  caption?: string
  /** Trailing slot — a Badge, a count, anything. Wins over `actionLabel`. */
  right?: ReactNode
  /** Renders a "See all ›" pressable when paired with `onAction`. */
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function SectionHeading({
  title,
  caption,
  right,
  actionLabel,
  onAction,
  className,
}: SectionHeadingProps) {
  const colors = useThemeColors()

  return (
    <View className={cn('mb-3 flex-row items-end justify-between gap-3', className)}>
      <View className="flex-1">
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {title}
        </Text>
        {caption ? (
          <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>

      {right ??
        (actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={10}
            onPress={onAction}
            className="min-h-[44px] flex-row items-center gap-0.5 pl-2 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-primary">{actionLabel}</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
        ) : null)}
    </View>
  )
}
