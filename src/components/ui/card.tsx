/**
 * Card — the shadcn surface, ported to React Native.
 *
 * shadow-* is unreliable in RN, so elevation comes from `border-border` plus the
 * card/background contrast the Ocean Breeze tokens already provide.
 */

import { View, Text, type ViewProps, type TextProps } from 'react-native'

import { cn } from '@/lib/cn'

export interface CardProps extends ViewProps {
  className?: string
}

export function Card({ className, ...props }: CardProps) {
  return <View className={cn('rounded-xl border border-border bg-card', className)} {...props} />
}

export function CardHeader({ className, ...props }: CardProps) {
  return <View className={cn('gap-1 p-4', className)} {...props} />
}

export interface CardTextProps extends TextProps {
  className?: string
}

export function CardTitle({ className, ...props }: CardTextProps) {
  return <Text className={cn('text-base font-semibold text-card-foreground', className)} {...props} />
}

export function CardDescription({ className, ...props }: CardTextProps) {
  return <Text className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: CardProps) {
  return <View className={cn('px-4 pb-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: CardProps) {
  return <View className={cn('flex-row items-center gap-2 px-4 pb-4', className)} {...props} />
}
