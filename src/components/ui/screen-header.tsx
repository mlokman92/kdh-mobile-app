/**
 * ScreenHeader — the top bar every screen shares.
 *
 * Uses useSafeAreaInsets() rather than SafeAreaView so a screen can put a
 * coloured hero behind the status bar and still have the title clear it.
 */

import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { router } from 'expo-router'

import { cn } from '@/lib/cn'
import { useThemeColors } from '@/lib/theme'

export interface ScreenHeaderProps {
  title: string
  subtitle?: string
  /** Show a back chevron. Defaults to false. */
  back?: boolean
  /** Custom back handler. Defaults to router.back(). */
  onBack?: () => void
  /** Rendered on the trailing edge — buttons, badges, an avatar. */
  right?: ReactNode
  /** Rendered under the title row (a search field, a filter strip). */
  children?: ReactNode
  /** Skip the safe-area top padding when the parent already applied it. */
  ignoreSafeArea?: boolean
  /** Drop the bottom hairline, e.g. when a hero image follows. */
  bordered?: boolean
  className?: string
}

export function ScreenHeader({
  title,
  subtitle,
  back = false,
  onBack,
  right,
  children,
  ignoreSafeArea = false,
  bordered = true,
  className,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()

  return (
    <View
      className={cn('bg-background px-4 pb-3', bordered && 'border-b border-border', className)}
      style={{ paddingTop: (ignoreSafeArea ? 0 : insets.top) + 8 }}
    >
      <View className="min-h-[44px] flex-row items-center gap-3">
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={onBack ?? (() => router.back())}
            className="h-11 w-11 -ml-2 items-center justify-center rounded-full active:bg-muted"
          >
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
        ) : null}

        <View className="flex-1">
          <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
      </View>

      {children ? <View className="mt-3">{children}</View> : null}
    </View>
  )
}
