/**
 * The printed asset tag. A real, scannable QR of the asset's payload — so a
 * phone pointed at the screen during a demo actually resolves it.
 */

import { Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { useThemeColors } from '@/lib/theme'
import type { Asset } from '@/lib/types'

export function QrTag({ payload, asset }: { payload: string; asset: Asset }) {
  const colors = useThemeColors()

  return (
    <View className="items-center gap-4 py-2">
      {/* The label itself always prints on white, exactly as it would on vinyl. */}
      <View className="items-center gap-3 rounded-xl border border-border p-5" style={{ backgroundColor: '#ffffff' }}>
        <QRCode
          value={payload}
          size={168}
          color="#0B2E38"
          backgroundColor="#ffffff"
          ecl="M"
        />
        <View className="items-center">
          <Text style={{ color: '#0B2E38' }} className="font-mono text-sm font-bold">
            {asset.code}
          </Text>
          <Text style={{ color: '#475569' }} className="mt-0.5 max-w-[200px] text-center text-[11px]">
            {asset.name}
          </Text>
          <Text style={{ color: '#64748b' }} className="mt-0.5 text-[10px]">
            {asset.town}, Johor · KEJORA
          </Text>
        </View>
      </View>

      <Text className="px-4 text-center text-[11px] leading-4 text-muted-foreground">
        Every KDH asset carries this tag. Scanning it opens the asset passport and lets a field
        officer raise a work order without typing a code.
      </Text>

      <View className="w-full rounded-lg bg-muted p-2.5">
        <Text className="font-mono text-[10px] text-muted-foreground" numberOfLines={2}>
          {payload}
        </Text>
      </View>
    </View>
  )
}
