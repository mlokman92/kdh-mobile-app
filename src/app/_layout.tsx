import '@/global.css'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { useColorSchemeName, useThemeColors } from '@/lib/theme'
import { AppStoreProvider } from '@/store/app-store'

export default function RootLayout() {
  const scheme = useColorSchemeName()
  const colors = useThemeColors()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStoreProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="asset/[id]" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </AppStoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
