/**
 * StatusBadge — one badge for every enumerated status in the domain.
 *
 * `statusTone()` is the single source of truth for "what colour is this word",
 * covering asset status, condition, criticality, work order status, priority,
 * SLA status, lease status and Copilot alert severity. Screens should never
 * write their own status → colour map.
 */

import { Badge, type BadgeProps, type BadgeVariant } from './badge'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/lib/theme'
import type {
  AlertSeverity,
  AssetStatus,
  Condition,
  Criticality,
  LeaseStatus,
  Priority,
  SlaStatus,
  WorkOrderStatus,
} from '@/lib/types'

/** Any value StatusBadge knows how to colour. */
export type StatusValue =
  | AssetStatus
  | Condition
  | Criticality
  | WorkOrderStatus
  | Priority
  | SlaStatus
  | LeaseStatus
  | AlertSeverity
  | (string & {})

const TONES: Record<string, BadgeVariant> = {
  /* --- Asset status --- */
  Active: 'success',
  Leased: 'success',
  Vacant: 'warning',
  'Under Maintenance': 'warning',
  'Under Construction': 'secondary',
  Idle: 'secondary',
  Disposed: 'outline',

  /* --- Condition --- */
  Excellent: 'success',
  Good: 'success',
  Fair: 'warning',
  Poor: 'destructive',

  /* --- Criticality (Critical is shared with Condition — same tone) --- */
  Critical: 'destructive',
  High: 'warning',
  Medium: 'secondary',
  Low: 'outline',

  /* --- Work order status --- */
  Open: 'warning',
  Assigned: 'secondary',
  'In Progress': 'default',
  'On Hold': 'outline',
  'Pending Parts': 'warning',
  'Pending Verification': 'secondary',
  Closed: 'success',
  Cancelled: 'outline',

  /* --- Priority --- */
  'P1 - Critical': 'destructive',
  'P2 - High': 'warning',
  'P3 - Medium': 'secondary',
  'P4 - Low': 'outline',

  /* --- SLA status --- */
  Met: 'success',
  'On Track': 'success',
  'At Risk': 'warning',
  Breached: 'destructive',

  /* --- Lease status --- */
  'Expiring Soon': 'warning',
  Expired: 'destructive',
  'Renewal In Progress': 'secondary',
  Terminated: 'outline',
  Draft: 'outline',

  /* --- Copilot alert severity (lowercase by contract) --- */
  critical: 'destructive',
  warning: 'warning',
  info: 'secondary',
  opportunity: 'success',
}

/** Resolve a domain status word to a Badge variant. Unknown values fall back to outline. */
export function statusTone(value: StatusValue): BadgeVariant {
  return TONES[value as string] ?? 'outline'
}

/** The resolved hex for a status — for SVG marks (map pins, chart dots). */
export function useStatusColor(value: StatusValue): string {
  const colors = useThemeColors()
  switch (statusTone(value)) {
    case 'destructive':
    case 'warning':
      return colors.destructive
    case 'success':
      return colors.primary
    case 'default':
      return colors.primary
    case 'secondary':
      return colors.chart2
    default:
      return colors.mutedForeground
  }
}

export interface StatusBadgeProps extends Omit<BadgeProps, 'label' | 'variant' | 'children'> {
  /** The status word itself — also the rendered label unless `label` is given. */
  status: StatusValue
  /** Override the rendered text (e.g. "P1" instead of "P1 - Critical"). */
  label?: string
  /** Force a variant, bypassing statusTone(). */
  variant?: BadgeVariant
}

export function StatusBadge({ status, label, variant, className, ...props }: StatusBadgeProps) {
  const text = label ?? capitalise(String(status))
  return <Badge variant={variant ?? statusTone(status)} label={text} className={cn(className)} {...props} />
}

/** Alert severities arrive lowercase; everything else is already title case. */
function capitalise(value: string): string {
  if (!value) return value
  return value[0].toUpperCase() + value.slice(1)
}
