/** Screen 2 — Asset Detail Passport: profile, documents and key info. */

import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  MapPin,
  QrCode,
  ShieldCheck,
  Wrench,
} from 'lucide-react-native'

import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Progress,
  Separator,
  StatusBadge,
} from '@/components/ui'
import { PassportHero } from '@/components/passport/passport-hero'
import { QrTag } from '@/components/passport/qr-tag'
import { formatLatLng } from '@/lib/geo'
import {
  daysUntil,
  formatArea,
  formatDate,
  formatHectares,
  formatMYR,
  formatMYRCompact,
  formatPct,
  formatRelative,
} from '@/lib/format'
import { useThemeColors } from '@/lib/theme'
import { useAppStore } from '@/store/app-store'
import type { AssetDocument } from '@/lib/types'

const TABS = ['Overview', 'Financials', 'Title', 'Maintenance', 'Documents'] as const
type Tab = (typeof TABS)[number]

export default function AssetPassportScreen() {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { getAsset, workOrdersForAsset } = useAppStore()

  const [tab, setTab] = useState<Tab>('Overview')
  const [showQr, setShowQr] = useState(false)
  const [doc, setDoc] = useState<AssetDocument | null>(null)

  const asset = id ? getAsset(id) : undefined
  const workOrders = useMemo(() => (asset ? workOrdersForAsset(asset.id) : []), [asset, workOrdersForAsset])

  if (!asset) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 24 }}>
        <EmptyState
          title="Asset not found"
          description="That asset is not on the register, or the link is out of date."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    )
  }

  const openJobs = workOrders.filter((w) => w.status !== 'Closed' && w.status !== 'Cancelled')
  const insuranceDays = daysUntil(asset.insuranceExpiry)

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
        showsVerticalScrollIndicator={false}
      >
        <PassportHero asset={asset} topInset={insets.top} />

        {/* Floating back / QR */}
        <View style={{ top: insets.top + 8 }} className="absolute left-4 right-4 flex-row justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-card/90 active:opacity-80"
          >
            <ArrowLeft size={18} color={colors.foreground} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show asset QR tag"
            onPress={() => setShowQr(true)}
            className="h-10 w-10 items-center justify-center rounded-full bg-card/90 active:opacity-80"
          >
            <QrCode size={18} color={colors.foreground} />
          </Pressable>
        </View>

        <View className="px-4 pt-4">
          {/* Key metrics */}
          <View className="flex-row gap-2">
            <Gauge label="Condition" value={asset.conditionScore} />
            <Gauge label="Utilisation" value={asset.utilisationRate} />
            <Gauge label="Risk" value={asset.riskScore} invert />
            <Gauge label="Data quality" value={asset.dataQualityScore} />
          </View>

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
          >
            {TABS.map((t) => (
              <Pressable
                key={t}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === t }}
                onPress={() => setTab(t)}
                className={
                  tab === t
                    ? 'rounded-full border border-primary bg-primary/15 px-3.5 py-2 active:opacity-80'
                    : 'rounded-full border border-border bg-card px-3.5 py-2 active:opacity-80'
                }
              >
                <Text
                  className={
                    tab === t ? 'text-xs font-semibold text-primary' : 'text-xs font-medium text-muted-foreground'
                  }
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* ---- Overview ---- */}
          {tab === 'Overview' ? (
            <Card className="p-4">
              <Row label="Asset code" value={asset.code} mono />
              <Row label="Category" value={asset.category} />
              <Row label="Sub-category" value={asset.subCategory} />
              <Row label="Custodian" value={asset.custodianName} />
              <Row label="Department" value={asset.custodianDepartment} />
              <Row label="Ownership" value={asset.ownership} />
              <Separator className="my-3" />
              <Row label="Zone" value={asset.zone.replace(/^Zon\s+/, '')} />
              <Row label="Town" value={`${asset.town}, ${asset.district}`} />
              <Row label="Address" value={asset.address} multiline />
              <Row label="Coordinates" value={formatLatLng(asset.lat, asset.lng)} mono />

              {asset.tags.length > 0 ? (
                <View className="mt-3 flex-row flex-wrap gap-1.5">
                  {asset.tags.map((t) => (
                    <View key={t} className="rounded bg-muted px-2 py-0.5">
                      <Text className="text-[10px] text-muted-foreground">{t}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* ---- Financials ---- */}
          {tab === 'Financials' ? (
            <View className="gap-3">
              <Card className="p-4">
                <Row label="Acquisition cost" value={formatMYR(asset.acquisitionCost)} />
                <Row label="Acquired" value={formatDate(asset.acquisitionDate)} />
                <Row label="Current value" value={formatMYR(asset.currentValue)} />
                <Row label="Net book value" value={formatMYR(asset.netBookValue)} />
                <Row label="Revenue YTD" value={formatMYR(asset.revenueYtd)} />
              </Card>

              <Card className="p-4">
                <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Value composition
                </Text>
                <View className="mt-3 gap-3">
                  <Bar
                    label="Net book value"
                    value={asset.netBookValue}
                    max={Math.max(asset.acquisitionCost, asset.currentValue)}
                  />
                  <Bar
                    label="Current value"
                    value={asset.currentValue}
                    max={Math.max(asset.acquisitionCost, asset.currentValue)}
                  />
                  <Bar
                    label="Acquisition cost"
                    value={asset.acquisitionCost}
                    max={Math.max(asset.acquisitionCost, asset.currentValue)}
                  />
                </View>
              </Card>
            </View>
          ) : null}

          {/* ---- Title & legal ---- */}
          {tab === 'Title' ? (
            <View className="gap-3">
              <Card className="p-4">
                <Row label="Title no." value={asset.titleNo} mono />
                <Row label="Lot no." value={asset.lotNo} mono />
                <Row label="Mukim" value={asset.mukim} />
                <Row label="Tenure" value={asset.tenure} />
                {asset.areaHectares != null ? (
                  <Row label="Land area" value={formatHectares(asset.areaHectares)} />
                ) : null}
                {asset.grossFloorAreaSqft != null ? (
                  <Row label="Gross floor area" value={formatArea(asset.grossFloorAreaSqft)} />
                ) : null}
                {asset.yearBuilt != null ? <Row label="Year built" value={String(asset.yearBuilt)} /> : null}
              </Card>

              <Card className="p-4">
                <View className="flex-row items-center gap-2">
                  <ShieldCheck size={15} color={colors.primary} />
                  <Text className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Insurance
                  </Text>
                </View>
                <View className="mt-3">
                  <Row label="Insurer" value={asset.insurerName ?? '—'} />
                  <Row
                    label="Sum insured"
                    value={asset.sumInsured != null ? formatMYR(asset.sumInsured) : '—'}
                  />
                  <Row label="Expires" value={formatDate(asset.insuranceExpiry)} />
                </View>
                {Number.isFinite(insuranceDays) ? (
                  <View
                    className={
                      insuranceDays <= 60
                        ? 'mt-3 rounded-lg bg-destructive/12 p-2.5'
                        : 'mt-3 rounded-lg bg-primary/10 p-2.5'
                    }
                  >
                    <Text
                      className={
                        insuranceDays <= 60
                          ? 'text-xs font-semibold text-destructive'
                          : 'text-xs font-semibold text-primary'
                      }
                    >
                      {insuranceDays < 0
                        ? `Lapsed ${Math.abs(insuranceDays)} days ago`
                        : `${insuranceDays} days of cover remaining`}
                    </Text>
                  </View>
                ) : null}
              </Card>
            </View>
          ) : null}

          {/* ---- Maintenance ---- */}
          {tab === 'Maintenance' ? (
            <View className="gap-3">
              <Card className="p-4">
                <Row label="Last inspection" value={formatDate(asset.lastInspection)} />
                <Row label="Next inspection" value={formatDate(asset.nextInspection)} />
                <Row label="Open work orders" value={String(openJobs.length)} />
              </Card>

              {workOrders.length === 0 ? (
                <EmptyState
                  title="No maintenance history"
                  description="Nothing has been raised against this asset yet."
                  icon={(c) => <Wrench size={24} color={c} />}
                />
              ) : (
                <Card>
                  {workOrders.map((w, i) => (
                    <Pressable
                      key={w.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${w.code}: ${w.title}`}
                      onPress={() => router.push('/tasks')}
                      className={
                        i === 0
                          ? 'min-h-[44px] flex-row items-center gap-3 p-3 active:bg-muted'
                          : 'min-h-[44px] flex-row items-center gap-3 border-t border-border p-3 active:bg-muted'
                      }
                    >
                      <View className="flex-1">
                        <Text className="font-mono text-[11px] text-muted-foreground">{w.code}</Text>
                        <Text className="mt-0.5 text-sm font-medium text-foreground" numberOfLines={1}>
                          {w.title}
                        </Text>
                        <View className="mt-1.5 flex-row gap-1.5">
                          <StatusBadge status={w.status} />
                          <StatusBadge status={w.slaStatus} />
                        </View>
                      </View>
                      <ChevronRight size={15} color={colors.mutedForeground} />
                    </Pressable>
                  ))}
                </Card>
              )}
            </View>
          ) : null}

          {/* ---- Documents ---- */}
          {tab === 'Documents' ? (
            asset.documents.length === 0 ? (
              <EmptyState
                title="No documents"
                description="No files have been attached to this asset record."
                icon={(c) => <FileText size={24} color={c} />}
              />
            ) : (
              <Card>
                {asset.documents.map((d, i) => (
                  <Pressable
                    key={d.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Preview ${d.name}`}
                    onPress={() => setDoc(d)}
                    className={
                      i === 0
                        ? 'min-h-[44px] flex-row items-center gap-3 p-3 active:bg-muted'
                        : 'min-h-[44px] flex-row items-center gap-3 border-t border-border p-3 active:bg-muted'
                    }
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/12">
                      <FileText size={15} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                        {d.name}
                      </Text>
                      <Text className="text-[11px] text-muted-foreground">
                        {d.type} · {d.sizeKb} KB · {formatDate(d.uploadedAt)}
                      </Text>
                    </View>
                    <ChevronRight size={15} color={colors.mutedForeground} />
                  </Pressable>
                ))}
              </Card>
            )
          ) : null}

          {/* ---- Lifecycle timeline ---- */}
          {asset.timeline.length > 0 ? (
            <View className="mt-6">
              <Text className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Lifecycle
              </Text>
              {asset.timeline.map((e, i) => (
                <View key={e.id} className="flex-row gap-3">
                  <View className="items-center">
                    <View className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    {i < asset.timeline.length - 1 ? <View className="w-px flex-1 bg-border" /> : null}
                  </View>
                  <View className="flex-1 pb-4">
                    <Text className="text-sm font-medium text-foreground">{e.title}</Text>
                    <Text className="text-[11px] text-muted-foreground">
                      {formatDate(e.at)}
                      {e.actor ? ` · ${e.actor}` : ''}
                    </Text>
                    {e.detail ? (
                      <Text className="mt-0.5 text-xs text-muted-foreground">{e.detail}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ---- Sticky actions ---- */}
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="absolute bottom-0 left-0 right-0 flex-row gap-2 border-t border-border bg-card px-4 pt-3"
      >
        <Button
          className="flex-1"
          title="Raise job"
          onPress={() => router.push(`/scan?asset=${asset.id}`)}
          leftIcon={(c) => <Wrench size={15} color={c} />}
        />
        <Button
          className="flex-1"
          variant="outline"
          title="View on map"
          onPress={() => router.push(`/map?focus=${asset.id}`)}
          leftIcon={(c) => <MapPin size={15} color={c} />}
        />
      </View>

      {/* ---- QR tag ---- */}
      <BottomSheet
        open={showQr}
        onClose={() => setShowQr(false)}
        title="Asset tag"
        description={asset.code}
        maxHeightRatio={0.7}
      >
        <QrTag payload={asset.qrPayload} asset={asset} />
      </BottomSheet>

      {/* ---- Document preview ---- */}
      <BottomSheet
        open={doc !== null}
        onClose={() => setDoc(null)}
        title={doc?.name}
        description={doc ? `${doc.type} · ${doc.sizeKb} KB` : undefined}
        maxHeightRatio={0.5}
      >
        <View className="items-center gap-3 py-8">
          <View className="h-16 w-16 items-center justify-center rounded-xl bg-muted">
            <FileText size={28} color={colors.mutedForeground} />
          </View>
          <Text className="text-center text-sm text-muted-foreground">
            Document preview is not part of this prototype. In the live system this opens the file
            from the KDH document store.
          </Text>
          {doc ? (
            <Text className="text-[11px] text-muted-foreground">
              Uploaded {formatRelative(doc.uploadedAt)}
            </Text>
          ) : null}
        </View>
      </BottomSheet>
    </View>
  )
}

/* ------------------------------------------------------------------ */

function Row({
  label,
  value,
  mono,
  multiline,
}: {
  label: string
  value: string
  mono?: boolean
  multiline?: boolean
}) {
  return (
    <View className="flex-row items-start justify-between gap-3 py-1.5">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text
        className={
          mono
            ? 'flex-1 text-right font-mono text-xs text-foreground'
            : 'flex-1 text-right text-xs font-medium text-foreground'
        }
        numberOfLines={multiline ? 3 : 1}
      >
        {value}
      </Text>
    </View>
  )
}

function Gauge({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const good = invert ? value <= 35 : value >= 75
  const mid = invert ? value <= 60 : value >= 60
  return (
    <View className="flex-1 rounded-lg border border-border bg-card p-2.5">
      <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
        {label}
      </Text>
      <Text className="mt-0.5 text-base font-bold text-foreground">{Math.round(value)}</Text>
      <Progress
        className="mt-1.5"
        value={value}
        height={4}
        tone={good ? 'primary' : mid ? 'warning' : 'danger'}
      />
    </View>
  )
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-[11px] text-muted-foreground">{label}</Text>
        <Text className="text-[11px] font-semibold text-foreground">{formatMYRCompact(value)}</Text>
      </View>
      <Progress value={pct} height={6} />
    </View>
  )
}
