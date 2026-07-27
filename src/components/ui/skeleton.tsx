/**
 * Skeleton — a muted placeholder block with a soft pulse.
 *
 * NativeWind only registers `className` on core RN components, so the animated
 * layer is styled with plain styles and the class-driven sizing lives on the
 * plain <View> wrapper around it.
 */

import { useEffect } from 'react'
import { View, type ViewProps } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'

import { cn } from '@/lib/cn'

export interface SkeletonProps extends ViewProps {
  /** Sizing and radius classes, e.g. "h-4 w-1/2 rounded-lg". */
  className?: string
  /** Turn the pulse off for long lists where the motion would be noisy. */
  animated?: boolean
}

export function Skeleton({ className, animated = true, style, ...props }: SkeletonProps) {
  const opacity = useSharedValue(0.55)

  useEffect(() => {
    if (!animated) return
    opacity.value = withRepeat(withTiming(1, { duration: 850 }), -1, true)
  }, [animated, opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value, flex: 1 }))

  return (
    <View className={cn('overflow-hidden rounded-md', className)} style={style} {...props}>
      {animated ? (
        <Animated.View style={animatedStyle}>
          <View className="h-full w-full bg-muted" />
        </Animated.View>
      ) : (
        <View className="h-full w-full bg-muted" />
      )}
    </View>
  )
}

/** Three stacked lines — the usual "a card is loading" shape. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <View className={cn('gap-3 rounded-xl border border-border bg-card p-4', className)}>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-2/5" />
    </View>
  )
}
