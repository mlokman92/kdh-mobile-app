/**
 * EmptyState — "nothing here" done properly: an icon in a tinted disc, a
 * headline, one calm sentence and an optional action.
 */

import type { ReactNode } from 'react'
import { View, Text } from 'react-native'

import { Button, type ButtonProps } from './button'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/lib/theme'

export interface EmptyStateProps {
  title: string
  description?: string
  /**
   * Icon rendered in the disc. Receives the resolved primary colour:
   * `icon={(c) => <Inbox size={26} color={c} />}`
   */
  icon?: ReactNode | ((color: string) => ReactNode)
  /** Primary action label. Renders a Button when both this and onAction are set. */
  actionLabel?: string
  onAction?: () => void
  actionProps?: Partial<ButtonProps>
  /** Anything extra below the action. */
  children?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  actionProps,
  children,
  className,
}: EmptyStateProps) {
  const colors = useThemeColors()
  const iconNode = typeof icon === 'function' ? icon(colors.primary) : icon

  return (
    <View className={cn('items-center justify-center gap-3 px-8 py-12', className)}>
      {iconNode ? (
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">{iconNode}</View>
      ) : null}

      <Text className="text-center text-base font-semibold text-foreground">{title}</Text>

      {description ? (
        <Text className="text-center text-sm leading-5 text-muted-foreground">{description}</Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="outline" className="mt-2" {...actionProps} />
      ) : null}

      {children}
    </View>
  )
}
