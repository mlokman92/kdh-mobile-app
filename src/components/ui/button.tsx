/**
 * Button — shadcn's variant/size API on a <Pressable>.
 *
 * Touch targets are at least 44pt tall in every size except `sm` (36pt, only
 * for inline secondary actions). Icons receive a resolved colour from
 * useThemeColors() because SVG props cannot take Tailwind classes.
 */

import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native'

import { cn, cv } from '@/lib/cn'
import { useThemeColors, type ThemeColors } from '@/lib/theme'

export type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'default' | 'lg' | 'icon'

const container = cv('flex-row items-center justify-center gap-2 rounded-lg', {
  variants: {
    variant: {
      default: 'bg-primary active:opacity-80',
      outline: 'border border-border bg-transparent active:bg-muted',
      secondary: 'bg-secondary active:opacity-80',
      ghost: 'bg-transparent active:bg-muted',
      destructive: 'bg-destructive active:opacity-80',
    },
    size: {
      sm: 'h-9 px-3',
      default: 'h-11 px-4',
      lg: 'h-12 px-6',
      icon: 'h-11 w-11 px-0',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

const label = cv('font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
      destructive: 'text-destructive-foreground',
    },
    size: {
      sm: 'text-sm',
      default: 'text-sm',
      lg: 'text-base',
      icon: 'text-sm',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

/** The colour an icon inside this variant should be painted. */
export function buttonForegroundColor(colors: ThemeColors, variant: ButtonVariant): string {
  switch (variant) {
    case 'default':
      return colors.primaryForeground
    case 'secondary':
      return colors.secondaryForeground
    case 'destructive':
      return colors.primaryForeground
    default:
      return colors.foreground
  }
}

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  /** Text label. Ignored when `children` is provided. */
  title?: string
  variant?: ButtonVariant
  size?: ButtonSize
  /**
   * Rendered before the label. Receives the resolved foreground colour so the
   * icon matches the variant:
   * `leftIcon={(c) => <Plus size={16} color={c} />}`
   * A plain element is accepted too.
   */
  leftIcon?: ReactNode | ((color: string) => ReactNode)
  /** Rendered after the label, same contract as `leftIcon`. */
  rightIcon?: ReactNode | ((color: string) => ReactNode)
  loading?: boolean
  disabled?: boolean
  className?: string
  /** Extra classes for the inner <Text>. */
  textClassName?: string
  children?: ReactNode
}

function renderSlot(slot: ButtonProps['leftIcon'], color: string): ReactNode {
  if (typeof slot === 'function') return slot(color)
  return slot ?? null
}

export function Button({
  title,
  variant = 'default',
  size = 'default',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  className,
  textClassName,
  children,
  ...props
}: ButtonProps) {
  const colors = useThemeColors()
  const fg = buttonForegroundColor(colors, variant)
  const isDisabled = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={container({ variant, size, className: cn(isDisabled && 'opacity-50', className) })}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {renderSlot(leftIcon, fg)}
          {children ??
            (title ? (
              <Text className={cn(label({ variant, size }), textClassName)} numberOfLines={1}>
                {title}
              </Text>
            ) : null)}
          {renderSlot(rightIcon, fg)}
        </>
      )}
    </Pressable>
  )
}

/** Convenience wrapper for an icon-only button — keeps the 44pt target. */
export function IconButton({ size = 'icon', ...props }: ButtonProps) {
  return <Button size={size} {...props} />
}

/** Exposed so callers can build a custom control that matches the button shape. */
export const buttonVariants = container
