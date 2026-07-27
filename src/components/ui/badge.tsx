/**
 * Badge — shadcn's badge with RN's no-cascade rule handled: the container and
 * the label are styled separately, because a className on a <View> never
 * reaches the <Text> inside it.
 */

import type { ReactNode } from 'react'
import { View, Text, type ViewProps } from 'react-native'

import { cn, cv } from '@/lib/cn'

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'

const container = cv('flex-row items-center gap-1 self-start rounded-full px-2.5 py-1', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary',
      destructive: 'bg-destructive',
      outline: 'border border-border bg-transparent',
      success: 'bg-primary/15',
      // Ocean Breeze has no amber token, so "warning" is a soft destructive
      // tint. The hierarchy reads solid red › soft red › blue › soft green.
      warning: 'bg-destructive/15',
    },
  },
  defaultVariants: { variant: 'default' },
})

const label = cv('text-xs font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      success: 'text-primary',
      warning: 'text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps extends ViewProps {
  variant?: BadgeVariant
  /** Text content. Ignored when `children` is provided. */
  label?: string
  className?: string
  /** Extra classes for the inner <Text>. */
  textClassName?: string
  children?: ReactNode
}

export function Badge({ variant = 'default', label: text, className, textClassName, children, ...props }: BadgeProps) {
  return (
    <View className={container({ variant, className })} {...props}>
      {children ?? <Text className={cn(label({ variant }), textClassName)}>{text}</Text>}
    </View>
  )
}
