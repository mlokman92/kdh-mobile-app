/**
 * Screen 4 — QR scan work order.
 *
 * Deliberately a SIMULATED scanner rather than expo-camera: a live camera means
 * a permission prompt and a device dependency in the middle of a client demo,
 * and it cannot run in a web export at all. The flow below tells the same
 * field-operations story with none of those failure modes, and says "Demo mode"
 * on screen so nobody is misled.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { router, useLocalSearchParams } from 'expo-router'
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Flashlight,
  Keyboard,
  QrCode,
  ScanLine,
} from 'lucide-react-native'

import { Button, Card, Progress, ScreenHeader, StatusBadge } from '@/components/ui'
import { RaiseForm } from '@/components/scan/raise-form'
import { formatDate, formatDateTime } from '@/lib/format'
import { useThemeColors } from '@/lib/theme'
import { useAppStore } from '@/store/app-store'
import type { Asset, WorkOrder } from '@/lib/types'

type Step = 'scanner' | 'identified' | 'raise' | 'done'

export default function ScanScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const store = useAppStore()
  const { assets, getAssetByCode, workOrders } = store
  const params = useLocalSearchParams<{ manual?: string; asset?: string }>()

  const [step, setStep] = useState<Step>('scanner')
  const [asset, setAsset] = useState<Asset | null>(null)
  const [decoding, setDecoding] = useState(false)
  const [manual, setManual] = useState(params.manual === '1')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [torch, setTorch] = useState(false)
  const [recent, setRecent] = useState<string[]>([])

  /** The work order the user just raised — newest user-added one for this asset. */
  const justCreated = useMemo(() => {
    if (!asset) return null
    return (
      workOrders
        .filter((w) => w.assetId === asset.id && w.isUserAdded)
        .sort((a, b) => new Date(b.raisedAt).getTime() - new Date(a.raisedAt).getTime())[0] ?? null
    )
  }, [workOrders, asset])

  // Deep-linked from the map or copilot: skip straight to the identified step.
  useEffect(() => {
    if (!params.asset) return
    const found = assets.find((a) => a.id === params.asset)
    if (found) {
      setAsset(found)
      setStep('identified')
    }
  }, [params.asset, assets])

  const identify = useCallback(
    (next: Asset) => {
      setAsset(next)
      setStep('identified')
      setError(null)
      setRecent((r) => [next.id, ...r.filter((id) => id !== next.id)].slice(0, 4))
    },
    [],
  )

  const simulate = useCallback(() => {
    setDecoding(true)
    setError(null)
    // Deterministic-ish pick so repeated demos don't always land on the same tag.
    const pick = assets[Math.floor((Date.now() / 1000) % assets.length)]
    setTimeout(() => {
      setDecoding(false)
      if (pick) identify(pick)
    }, 950)
  }, [assets, identify])

  const submitCode = useCallback(() => {
    const found = getAssetByCode(code.trim().toUpperCase())
    if (!found) {
      setError(`No asset tagged ${code.trim().toUpperCase()}`)
      return
    }
    identify(found)
    setCode('')
  }, [code, getAssetByCode, identify])

  const reset = useCallback(() => {
    setStep('scanner')
    setAsset(null)
    setError(null)
  }, [])

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Scan Asset Tag"
        subtitle={
          step === 'scanner'
            ? 'Point at a KDH QR label to raise a job on the spot'
            : asset
              ? asset.name
              : undefined
        }
        back={step !== 'scanner'}
        onBack={reset}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'scanner' ? (
          <>
            <Viewport decoding={decoding} torch={torch} />

            <View className="flex-row gap-2">
              <Button
                className="flex-1"
                title={decoding ? 'Decoding tag…' : 'Simulate a scan'}
                loading={decoding}
                onPress={simulate}
                leftIcon={(c) => <ScanLine size={16} color={c} />}
              />
              <Button
                variant="outline"
                size="icon"
                accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
                onPress={() => setTorch((t) => !t)}
                leftIcon={(c) => <Flashlight size={16} color={c} />}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setManual((m) => !m)}
              className="min-h-[44px] flex-row items-center justify-center gap-2 active:opacity-70"
            >
              <Keyboard size={14} color={colors.mutedForeground} />
              <Text className="text-sm font-medium text-muted-foreground">
                {manual ? 'Hide manual entry' : 'Enter code manually'}
              </Text>
            </Pressable>

            {manual ? (
              <Card className="p-3">
                <Text className="text-xs font-semibold text-foreground">Asset code</Text>
                <View className="mt-2 flex-row gap-2">
                  <TextInput
                    value={code}
                    onChangeText={(v) => {
                      setCode(v)
                      setError(null)
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="KDH-CP-0042"
                    placeholderTextColor={colors.mutedForeground}
                    onSubmitEditing={submitCode}
                    style={{
                      flex: 1,
                      height: 44,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: error ? colors.destructive : colors.border,
                      color: colors.foreground,
                      fontFamily: 'monospace',
                    }}
                  />
                  <Button title="Find" onPress={submitCode} disabled={code.trim().length < 3} />
                </View>
                {error ? (
                  <Text className="mt-2 text-xs text-destructive">{error}</Text>
                ) : (
                  <Text className="mt-2 text-[11px] text-muted-foreground">
                    Every KDH asset carries a printed tag in this format.
                  </Text>
                )}
              </Card>
            ) : null}

            {recent.length > 0 ? (
              <View>
                <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Recent scans
                </Text>
                <Card>
                  {recent.map((id, i) => {
                    const a = assets.find((x) => x.id === id)
                    if (!a) return null
                    return (
                      <Pressable
                        key={id}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${a.name}`}
                        onPress={() => identify(a)}
                        className={
                          i === 0
                            ? 'min-h-[44px] flex-row items-center gap-3 p-3 active:bg-muted'
                            : 'min-h-[44px] flex-row items-center gap-3 border-t border-border p-3 active:bg-muted'
                        }
                      >
                        <QrCode size={16} color={colors.mutedForeground} />
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                            {a.name}
                          </Text>
                          <Text className="font-mono text-[11px] text-muted-foreground">{a.code}</Text>
                        </View>
                        <ChevronRight size={15} color={colors.mutedForeground} />
                      </Pressable>
                    )
                  })}
                </Card>
              </View>
            ) : null}
          </>
        ) : null}

        {step === 'identified' && asset ? (
          <IdentifiedCard
            asset={asset}
            openJobs={workOrders.filter(
              (w) => w.assetId === asset.id && w.status !== 'Closed' && w.status !== 'Cancelled',
            ).length}
            onPassport={() => router.push(`/asset/${asset.id}`)}
            onRaise={() => setStep('raise')}
            onAgain={reset}
          />
        ) : null}

        {step === 'raise' && asset ? (
          <RaiseForm
            asset={asset}
            technicians={store.technicians}
            onCancel={() => setStep('identified')}
            onSubmit={(input) => {
              store.addWorkOrder(input)
              setStep('done')
            }}
          />
        ) : null}

        {step === 'done' && asset ? (
          <DoneCard
            assetName={asset.name}
            /* The store mints the code, so read the newest one back rather than
               guessing it here. */
            workOrder={justCreated}
            onTasks={() => {
              reset()
              router.push('/tasks')
            }}
            onAgain={reset}
          />
        ) : null}
      </ScrollView>
    </View>
  )
}

/* ------------------------------------------------------------------ */

function Viewport({ decoding, torch }: { decoding: boolean; torch: boolean }) {
  const colors = useThemeColors()
  const y = useSharedValue(0)

  useEffect(() => {
    y.value = 0
    y.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true)
  }, [y])

  const lineStyle = useAnimatedStyle(() => ({
    top: `${y.value * 100}%`,
  }))

  return (
    <View
      className="h-72 items-center justify-center overflow-hidden rounded-2xl border border-border"
      style={{ backgroundColor: '#0B2E38' }}
    >
      {/* Reticle */}
      <View className="h-48 w-48">
        <Corner className="left-0 top-0 border-l-2 border-t-2" />
        <Corner className="right-0 top-0 border-r-2 border-t-2" />
        <Corner className="bottom-0 left-0 border-b-2 border-l-2" />
        <Corner className="bottom-0 right-0 border-b-2 border-r-2" />

        <Animated.View
          style={[{ position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.primary }, lineStyle]}
        />
      </View>

      <View className="absolute left-3 top-3 flex-row items-center gap-1.5 rounded-full bg-primary/20 px-2 py-1">
        <View className="h-1.5 w-1.5 rounded-full bg-primary" />
        <Text className="text-[10px] font-bold text-primary">DEMO MODE</Text>
      </View>

      {torch ? (
        <View className="absolute right-3 top-3 rounded-full bg-primary/20 px-2 py-1">
          <Text className="text-[10px] font-bold text-primary">TORCH ON</Text>
        </View>
      ) : null}

      <Text className="absolute bottom-4 text-xs text-primary/80">
        {decoding ? 'Decoding tag…' : 'Align the QR label inside the frame'}
      </Text>
    </View>
  )
}

function Corner({ className }: { className: string }) {
  return <View className={`absolute h-8 w-8 border-primary ${className}`} />
}

function IdentifiedCard({
  asset,
  openJobs,
  onPassport,
  onRaise,
  onAgain,
}: {
  asset: Asset
  openJobs: number
  onPassport: () => void
  onRaise: () => void
  onAgain: () => void
}) {
  const colors = useThemeColors()
  return (
    <>
      <View className="flex-row items-center gap-2 rounded-lg bg-primary/12 p-3">
        <CheckCircle2 size={16} color={colors.primary} />
        <Text className="flex-1 text-sm font-semibold text-primary">Tag decoded successfully</Text>
      </View>

      <Card className="p-4">
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/12">
            <Building2 size={20} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="font-mono text-[11px] text-muted-foreground">{asset.code}</Text>
            <Text className="mt-0.5 text-base font-bold text-foreground">{asset.name}</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {asset.category} · {asset.town}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap gap-1.5">
          <StatusBadge status={asset.status} />
          <StatusBadge status={asset.condition} />
          <StatusBadge status={asset.criticality} />
        </View>

        <View className="mt-4 gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] text-muted-foreground">Condition score</Text>
            <Text className="text-[11px] font-semibold text-foreground">{asset.conditionScore}</Text>
          </View>
          <Progress
            value={asset.conditionScore}
            height={6}
            tone={asset.conditionScore >= 75 ? 'primary' : asset.conditionScore >= 60 ? 'warning' : 'danger'}
          />
        </View>

        <View className="mt-4 flex-row border-t border-border pt-3">
          <Fact label="Custodian" value={asset.custodianName} />
          <Fact label="Last inspection" value={formatDate(asset.lastInspection)} />
          <Fact label="Open jobs" value={String(openJobs)} />
        </View>
      </Card>

      <View className="gap-2">
        <Button title="Raise work order" onPress={onRaise} />
        <Button variant="outline" title="Open asset passport" onPress={onPassport} />
        <Button variant="ghost" title="Scan again" onPress={onAgain} />
      </View>
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text className="mt-0.5 text-xs font-semibold text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

function DoneCard({
  assetName,
  workOrder,
  onTasks,
  onAgain,
}: {
  assetName: string
  workOrder: WorkOrder | null
  onTasks: () => void
  onAgain: () => void
}) {
  const colors = useThemeColors()
  return (
    <>
      <View className="items-center gap-3 py-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <CheckCircle2 size={30} color={colors.primary} />
        </View>
        <Text className="text-lg font-bold text-foreground">Work order raised</Text>
        <Text className="text-center text-sm text-muted-foreground">
          Logged against {assetName} and queued to sync with the KDH One Asset web console.
        </Text>
        {workOrder ? (
          <Text className="font-mono text-base font-bold text-primary">{workOrder.code}</Text>
        ) : null}
      </View>

      {workOrder ? (
        <Card className="p-4">
          <Row label="Priority" value={workOrder.priority} />
          <Row label="Assigned to" value={workOrder.assignedTo} />
          <Row label="SLA" value={`${workOrder.slaHours} hours`} />
          <Row label="Due" value={formatDateTime(workOrder.slaDueAt)} />
        </Card>
      ) : null}

      <View className="gap-2">
        <Button title="View in tasks" onPress={onTasks} />
        <Button variant="outline" title="Scan another asset" onPress={onAgain} />
      </View>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-1">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className="flex-1 text-right text-xs font-semibold text-foreground" numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}
