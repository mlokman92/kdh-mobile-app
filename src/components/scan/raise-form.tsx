/** Raise-a-work-order form, pre-filled from the scanned asset. */

import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { CalendarClock, Paperclip, X } from 'lucide-react-native'

import { Avatar, Button, Card, Separator } from '@/components/ui'
import { formatDateTime } from '@/lib/format'
import { useThemeColors } from '@/lib/theme'
import {
  PRIORITIES,
  WO_TYPES,
  type Asset,
  type NewWorkOrderInput,
  type Priority,
  type Technician,
  type WorkOrderType,
} from '@/lib/types'

/** Mirrors the store's own SLA ladder so the preview matches what gets saved. */
const SLA_HOURS: Record<Priority, number> = {
  'P1 - Critical': 4,
  'P2 - High': 24,
  'P3 - Medium': 72,
  'P4 - Low': 168,
}

const QUICK_TYPES: WorkOrderType[] = ['Corrective', 'Preventive', 'Inspection', 'Emergency']

export interface RaiseFormProps {
  asset: Asset
  technicians: Technician[]
  onCancel: () => void
  onSubmit: (input: NewWorkOrderInput) => void
}

export function RaiseForm({ asset, technicians, onCancel, onSubmit }: RaiseFormProps) {
  const colors = useThemeColors()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<WorkOrderType>('Corrective')
  const [priority, setPriority] = useState<Priority>('P3 - Medium')
  const [assignee, setAssignee] = useState<Technician | null>(null)
  const [attachments, setAttachments] = useState<string[]>([])

  const slaHours = SLA_HOURS[priority]
  const dueAt = useMemo(
    () => new Date(Date.now() + slaHours * 3600_000).toISOString(),
    [slaHours],
  )

  // Prefer a technician already covering this asset's zone.
  const suggested = useMemo(
    () => technicians.filter((t) => t.zone === asset.zone),
    [technicians, asset.zone],
  )
  const roster = suggested.length > 0 ? suggested : technicians

  const valid = title.trim().length >= 4

  return (
    <View className="gap-4">
      <Card className="p-3">
        <Text className="font-mono text-[11px] text-muted-foreground">{asset.code}</Text>
        <Text className="mt-0.5 text-sm font-bold text-foreground" numberOfLines={1}>
          {asset.name}
        </Text>
        <Text className="text-[11px] text-muted-foreground">
          {asset.town} · {asset.zone.replace(/^Zon\s+/, '')}
        </Text>
      </Card>

      {/* Title */}
      <Field label="What is the problem?" required>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Aircond unit at ground floor not cooling"
          placeholderTextColor={colors.mutedForeground}
          style={inputStyle(colors)}
        />
      </Field>

      {/* Description */}
      <Field label="Details">
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Anything the technician should know before arriving"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          style={[inputStyle(colors), { height: 96, paddingTop: 12, textAlignVertical: 'top' }]}
        />
      </Field>

      {/* Type */}
      <Field label="Job type">
        <View className="flex-row flex-wrap gap-2">
          {QUICK_TYPES.map((t) => (
            <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />
          ))}
        </View>
      </Field>

      {/* Priority */}
      <Field label="Priority">
        <View className="flex-row flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <Chip
              key={p}
              label={p.split(' - ')[0]}
              sublabel={p.split(' - ')[1]}
              active={priority === p}
              danger={p === 'P1 - Critical'}
              onPress={() => setPriority(p)}
            />
          ))}
        </View>
      </Field>

      {/* SLA preview */}
      <View className="flex-row items-center gap-3 rounded-lg border border-border bg-primary/8 p-3">
        <CalendarClock size={18} color={colors.primary} />
        <View className="flex-1">
          <Text className="text-xs font-bold text-primary">
            {slaHours}-hour response SLA
          </Text>
          <Text className="text-[11px] text-muted-foreground">Due {formatDateTime(dueAt)}</Text>
        </View>
      </View>

      {/* Assignee */}
      <Field label="Assign to">
        <View className="gap-2">
          {roster.slice(0, 4).map((t) => {
            const on = assignee?.id === t.id
            return (
              <Pressable
                key={t.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setAssignee(on ? null : t)}
                className={
                  on
                    ? 'min-h-[44px] flex-row items-center gap-3 rounded-lg border border-primary bg-primary/10 p-2.5 active:opacity-80'
                    : 'min-h-[44px] flex-row items-center gap-3 rounded-lg border border-border bg-card p-2.5 active:opacity-80'
                }
              >
                <Avatar name={t.name} size="sm" />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    {t.team} · {t.openJobs} open · {t.utilisation}% utilised
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </Field>

      {/* Attachment affordance */}
      <View className="flex-row flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          title="Attach photo"
          leftIcon={(c) => <Paperclip size={14} color={c} />}
          onPress={() => setAttachments((a) => [...a, `IMG_${1000 + a.length}.jpg`])}
        />
        {attachments.map((a) => (
          <Pressable
            key={a}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${a}`}
            onPress={() => setAttachments((list) => list.filter((x) => x !== a))}
            className="flex-row items-center gap-1 rounded-full bg-muted px-2.5 py-1 active:opacity-70"
          >
            <Text className="font-mono text-[11px] text-muted-foreground">{a}</Text>
            <X size={11} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>

      <Separator />

      <View className="flex-row gap-2">
        <Button className="flex-1" variant="outline" title="Back" onPress={onCancel} />
        <Button
          className="flex-1"
          title="Submit"
          disabled={!valid}
          onPress={() =>
            onSubmit({
              assetId: asset.id,
              title: title.trim(),
              description: description.trim() || undefined,
              type,
              priority,
              source: 'QR Scan',
              assignedTo: assignee?.name,
              slaHours,
            })
          }
        />
      </View>
      {!valid ? (
        <Text className="-mt-2 text-center text-[11px] text-muted-foreground">
          Add a short problem description to submit.
        </Text>
      ) : null}
    </View>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-bold text-foreground">
        {label}
        {required ? <Text className="text-destructive"> *</Text> : null}
      </Text>
      {children}
    </View>
  )
}

function Chip({
  label,
  sublabel,
  active,
  danger,
  onPress,
}: {
  label: string
  sublabel?: string
  active: boolean
  danger?: boolean
  onPress: () => void
}) {
  const border = active ? (danger ? 'border-destructive' : 'border-primary') : 'border-border'
  const bg = active ? (danger ? 'bg-destructive/10' : 'bg-primary/12') : 'bg-card'
  const fg = active
    ? danger
      ? 'text-destructive'
      : 'text-primary'
    : 'text-muted-foreground'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`min-h-[44px] justify-center rounded-lg border px-3 py-2 active:opacity-80 ${border} ${bg}`}
    >
      <Text className={`text-xs font-semibold ${fg}`}>{label}</Text>
      {sublabel ? <Text className="text-[10px] text-muted-foreground">{sublabel}</Text> : null}
    </Pressable>
  )
}

function inputStyle(colors: ReturnType<typeof useThemeColors>) {
  return {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.foreground,
    fontSize: 14,
  } as const
}
