/**
 * The five-tab shell.
 *
 * `Tabs` is imported from 'expo-router/js-tabs' — the export on the package
 * root is deprecated in SDK 57.
 *
 * Scan is rendered as a raised centre action rather than a normal tab, because
 * scanning a QR label is the single thing a field officer does most.
 */

import { Tabs } from 'expo-router/js-tabs'
import { ClipboardList, LayoutDashboard, Map, ScanLine, Sparkles } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useThemeColors } from '@/lib/theme'
import { useAppStore } from '@/store/app-store'
import type { BottomTabBarButtonProps } from 'expo-router/js-tabs'

export default function TabsLayout() {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const { openWorkOrders, unacknowledgedAlerts } = useAppStore()

  const openCount = openWorkOrders.length
  const alertCount = unacknowledgedAlerts.length

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          height: 62 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarBadgeStyle: {
          backgroundColor: colors.destructive,
          color: colors.primaryForeground,
          fontSize: 10,
          fontWeight: '700',
          minWidth: 18,
          lineHeight: 14,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Map size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => <ScanLine size={22} color={color} />,
          tabBarButton: (props) => <ScanTabButton {...props} />,
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} />,
          tabBarBadge: openCount > 0 ? openCount : undefined,
        }}
      />

      <Tabs.Screen
        name="copilot"
        options={{
          title: 'Copilot',
          tabBarIcon: ({ color }) => <Sparkles size={22} color={color} />,
          tabBarBadge: alertCount > 0 ? alertCount : undefined,
        }}
      />
    </Tabs>
  )
}

/** The raised centre action. Keeps a 44pt target and its own label. */
function ScanTabButton({ onPress, accessibilityState, testID }: BottomTabBarButtonProps) {
  const colors = useThemeColors()
  const focused = accessibilityState?.selected ?? false

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Scan an asset QR label"
      accessibilityState={accessibilityState}
      testID={testID}
      onPress={onPress}
      className="flex-1 items-center justify-center active:opacity-80"
    >
      <View
        className={
          focused
            ? 'h-11 w-11 items-center justify-center rounded-full bg-primary'
            : 'h-11 w-11 items-center justify-center rounded-full bg-primary/85'
        }
      >
        <ScanLine size={22} color={colors.primaryForeground} />
      </View>
      <Text className="mt-0.5 text-[11px] font-semibold text-primary">Scan</Text>
    </Pressable>
  )
}
