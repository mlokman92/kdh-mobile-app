/**
 * BottomSheet — RN <Modal> + a Reanimated slide, with a real drag-to-dismiss
 * handle and a backdrop that closes on press.
 *
 * Kept deliberately small: no snap points, no gesture-driven scroll handoff.
 * Put a <ScrollView> inside `children` if the content can overflow.
 *
 * Note: NativeWind does not register `className` on Animated.View or
 * GestureHandlerRootView, so those two carry plain styles and every visual
 * token lives on the plain <View> / <Pressable> inside them.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cn } from '@/lib/cn'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: ReactNode
  /** Hide the grabber (and with it, drag-to-dismiss). */
  showHandle?: boolean
  /** Fraction of the screen the sheet may occupy. Default 0.88. */
  maxHeightRatio?: number
  /** Classes for the sheet surface. */
  className?: string
  /** Classes for the content area under the header. */
  contentClassName?: string
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  showHandle = true,
  maxHeightRatio = 0.88,
  className,
  contentClassName,
}: BottomSheetProps) {
  const { height: screenHeight } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(open)
  const sheetHeight = useRef(screenHeight * 0.6)

  const translateY = useSharedValue(screenHeight)
  const backdrop = useSharedValue(0)

  useEffect(() => {
    if (open) {
      setMounted(true)
      translateY.value = sheetHeight.current
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) })
      backdrop.value = withTiming(1, { duration: 220 })
    } else {
      backdrop.value = withTiming(0, { duration: 180 })
      translateY.value = withTiming(
        sheetHeight.current,
        { duration: 200, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false)
        },
      )
    }
  }, [open, translateY, backdrop])

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }))
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }))

  const pan = Gesture.Pan()
    .enabled(showHandle)
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY)
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 850) {
        translateY.value = withTiming(sheetHeight.current, { duration: 180 }, (finished) => {
          if (finished) runOnJS(onClose)()
        })
      } else {
        translateY.value = withSpring(0, { damping: 22, stiffness: 240 })
      }
    })

  if (!mounted) return null

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <View className="flex-1 justify-end">
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="flex-1 bg-foreground/40"
              onPress={onClose}
            />
          </Animated.View>

          <Animated.View
            style={[sheetStyle, { maxHeight: screenHeight * maxHeightRatio }]}
            onLayout={(e) => {
              sheetHeight.current = e.nativeEvent.layout.height
            }}
          >
            <View
              className={cn('overflow-hidden rounded-t-2xl border-t border-border bg-card', className)}
              style={{ paddingBottom: insets.bottom + 12 }}
            >
              {showHandle ? (
                <GestureDetector gesture={pan}>
                  <View className="items-center py-3">
                    <View className="h-1.5 w-10 rounded-full bg-border" />
                  </View>
                </GestureDetector>
              ) : (
                <View className="h-3" />
              )}

              {title || description ? (
                <View className="gap-1 border-b border-border px-4 pb-3">
                  {title ? <Text className="text-lg font-bold text-card-foreground">{title}</Text> : null}
                  {description ? <Text className="text-sm text-muted-foreground">{description}</Text> : null}
                </View>
              ) : null}

              <View className={cn('px-4 pt-4', contentClassName)}>{children}</View>
            </View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
