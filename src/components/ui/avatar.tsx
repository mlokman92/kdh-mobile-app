/**
 * Avatar — initials on a tinted disc. No image files anywhere in this demo, so
 * the fallback IS the avatar.
 */

import { View, Text, type ViewProps } from 'react-native'

import { cn, cv } from '@/lib/cn'
import { initials as toInitials } from '@/lib/format'

export type AvatarSize = 'sm' | 'default' | 'lg'
export type AvatarTone = 'primary' | 'secondary' | 'muted' | 'accent'

const disc = cv('items-center justify-center rounded-full', {
  variants: {
    size: {
      sm: 'h-8 w-8',
      default: 'h-10 w-10',
      lg: 'h-14 w-14',
    },
    tone: {
      primary: 'bg-primary/15',
      secondary: 'bg-secondary',
      muted: 'bg-muted',
      accent: 'bg-accent',
    },
  },
  defaultVariants: { size: 'default', tone: 'primary' },
})

const label = cv('font-semibold', {
  variants: {
    size: {
      sm: 'text-[11px]',
      default: 'text-sm',
      lg: 'text-lg',
    },
    tone: {
      primary: 'text-primary',
      secondary: 'text-secondary-foreground',
      muted: 'text-muted-foreground',
      accent: 'text-accent-foreground',
    },
  },
  defaultVariants: { size: 'default', tone: 'primary' },
})

export interface AvatarProps extends ViewProps {
  /** Full name — initials are derived with the shared `initials()` formatter. */
  name?: string
  /** Pre-computed initials. Wins over `name` when both are given. */
  initials?: string
  size?: AvatarSize
  tone?: AvatarTone
  className?: string
  textClassName?: string
}

export function Avatar({ name, initials, size = 'default', tone = 'primary', className, textClassName, ...props }: AvatarProps) {
  const text = initials ?? (name ? toInitials(name) : '?')
  return (
    <View
      accessible
      accessibilityLabel={name ?? text}
      className={disc({ size, tone, className })}
      {...props}
    >
      <Text className={cn(label({ size, tone }), textClassName)}>{text}</Text>
    </View>
  )
}
