/**
 * SLA arithmetic, urgency bucketing and the work-order state machine.
 *
 * `mock.ts` stamps `slaStatus` once, against the dataset clock. The Tasks screen
 * runs a live countdown, so every visual decision here is recomputed from
 * `slaDueAt` against the current tick instead of trusting the stored field.
 */

import {
  Activity,
  CalendarCheck,
  ClipboardCheck,
  ShieldCheck,
  Siren,
  TrendingUp,
  Wrench,
} from 'lucide-react-native'
import type { ComponentType } from 'react'

import type { Priority, SlaStatus, WorkOrder, WorkOrderStatus, WorkOrderType } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

export function isFinished(status: WorkOrderStatus): boolean {
  return status === 'Closed' || status === 'Cancelled'
}

/**
 * The forward path a field officer walks a job down:
 * Open → Assigned → In Progress → Pending Verification → Closed.
 * Parked states (On Hold, Pending Parts) rejoin at In Progress.
 */
const NEXT_STATUS: Partial<Record<WorkOrderStatus, WorkOrderStatus>> = {
  Open: 'Assigned',
  Assigned: 'In Progress',
  'In Progress': 'Pending Verification',
  'Pending Verification': 'Closed',
  'On Hold': 'In Progress',
  'Pending Parts': 'In Progress',
}

/** Short verb for the advance control — "Start" reads better than "In Progress". */
const NEXT_VERB: Partial<Record<WorkOrderStatus, string>> = {
  Open: 'Assign',
  Assigned: 'Start',
  'In Progress': 'Verify',
  'Pending Verification': 'Close',
  'On Hold': 'Resume',
  'Pending Parts': 'Resume',
}

export function nextStatus(status: WorkOrderStatus): WorkOrderStatus | null {
  return NEXT_STATUS[status] ?? null
}

export function nextStatusVerb(status: WorkOrderStatus): string | null {
  return NEXT_VERB[status] ?? null
}

export const PRIORITY_SHORT: Record<Priority, string> = {
  'P1 - Critical': 'P1',
  'P2 - High': 'P2',
  'P3 - Medium': 'P3',
  'P4 - Low': 'P4',
}

export const PRIORITY_RANK: Record<Priority, number> = {
  'P1 - Critical': 0,
  'P2 - High': 1,
  'P3 - Medium': 2,
  'P4 - Low': 3,
}

export type TaskIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

export const TYPE_ICON: Record<WorkOrderType, TaskIcon> = {
  Corrective: Wrench,
  Preventive: CalendarCheck,
  Predictive: Activity,
  Inspection: ClipboardCheck,
  'Statutory Compliance': ShieldCheck,
  Emergency: Siren,
  'Upgrade / Improvement': TrendingUp,
}

/* ------------------------------------------------------------------ */
/* Live SLA                                                            */
/* ------------------------------------------------------------------ */

export type SlaTone = 'breach' | 'risk' | 'ok' | 'met' | 'idle'

/** Recompute the SLA verdict against a live clock rather than the stored field. */
export function liveSlaStatus(wo: WorkOrder, nowMs: number): SlaStatus {
  const due = new Date(wo.slaDueAt).getTime()
  if (wo.status === 'Closed') {
    const done = wo.completedAt ? new Date(wo.completedAt).getTime() : nowMs
    return done <= due ? 'Met' : 'Breached'
  }
  if (wo.status === 'Cancelled') return wo.slaStatus
  if (nowMs > due) return 'Breached'
  const raised = new Date(wo.raisedAt).getTime()
  const windowMs = Math.max(1, due - raised)
  return due - nowMs < windowMs * 0.25 ? 'At Risk' : 'On Track'
}

export function slaTone(status: SlaStatus, woStatus: WorkOrderStatus): SlaTone {
  if (woStatus === 'Cancelled') return 'idle'
  switch (status) {
    case 'Breached':
      return woStatus === 'Closed' ? 'breach' : 'breach'
    case 'At Risk':
      return 'risk'
    case 'Met':
      return 'met'
    default:
      return 'ok'
  }
}

/** "2d 4h" / "3h 07m" / "12m 45s" — seconds only appear inside the final hour. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(Math.abs(ms) / 1000))
  const d = Math.floor(total / 86_400)
  const h = Math.floor((total % 86_400) / 3_600)
  const m = Math.floor((total % 3_600) / 60)
  const s = total % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export interface SlaReading {
  /** Live verdict for the badge tone. */
  status: SlaStatus
  tone: SlaTone
  /** Headline for the pill, e.g. "3h 07m left" or "Over by 1d 4h". */
  text: string
  /** Bare countdown, for the ring in the detail sheet. */
  clock: string
  /** Caption under the ring, e.g. "left" / "over" / "on time". */
  caption: string
  /** How far through the SLA window the job is, 0–100. */
  elapsedPct: number
  /** Signed milliseconds remaining. Negative once breached. */
  remainingMs: number
}

export function readSla(wo: WorkOrder, nowMs: number): SlaReading {
  const raised = new Date(wo.raisedAt).getTime()
  const due = new Date(wo.slaDueAt).getTime()
  const windowMs = Math.max(1, due - raised)
  const status = liveSlaStatus(wo, nowMs)
  const tone = slaTone(status, wo.status)

  if (wo.status === 'Cancelled') {
    return {
      status,
      tone,
      text: 'Cancelled',
      clock: '—',
      caption: 'cancelled',
      elapsedPct: 100,
      remainingMs: 0,
    }
  }

  if (wo.status === 'Closed') {
    const done = wo.completedAt ? new Date(wo.completedAt).getTime() : nowMs
    const margin = due - done
    return {
      status,
      tone,
      text: margin >= 0 ? `Met · ${formatDuration(margin)} spare` : `Breached · ${formatDuration(margin)} over`,
      clock: formatDuration(margin),
      caption: margin >= 0 ? 'inside SLA' : 'past SLA',
      elapsedPct: Math.max(0, Math.min(100, ((done - raised) / windowMs) * 100)),
      remainingMs: margin,
    }
  }

  const remainingMs = due - nowMs
  return {
    status,
    tone,
    text: remainingMs >= 0 ? `${formatDuration(remainingMs)} left` : `Over by ${formatDuration(remainingMs)}`,
    clock: formatDuration(remainingMs),
    caption: remainingMs >= 0 ? 'to SLA due' : 'past SLA due',
    elapsedPct: Math.max(0, Math.min(100, ((nowMs - raised) / windowMs) * 100)),
    remainingMs,
  }
}

/* ------------------------------------------------------------------ */
/* Urgency buckets — the sticky section headers                        */
/* ------------------------------------------------------------------ */

export const URGENCY_KEYS = ['overdue', 'today', 'week', 'later', 'completed'] as const
export type UrgencyKey = (typeof URGENCY_KEYS)[number]

export const URGENCY_LABEL: Record<UrgencyKey, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'This week',
  later: 'Later',
  completed: 'Completed',
}

/** End of the calendar day containing `nowMs`, in epoch ms. */
export function endOfDay(nowMs: number): number {
  const d = new Date(nowMs)
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

export function urgencyOf(wo: WorkOrder, nowMs: number): UrgencyKey {
  if (isFinished(wo.status)) return 'completed'
  const due = new Date(wo.slaDueAt).getTime()
  if (due < nowMs) return 'overdue'
  if (due <= endOfDay(nowMs)) return 'today'
  if (due <= nowMs + 7 * 86_400_000) return 'week'
  return 'later'
}

/* ------------------------------------------------------------------ */
/* Checklist                                                           */
/* ------------------------------------------------------------------ */

export function checklistDone(wo: WorkOrder): number {
  return wo.checklist.filter((c) => c.done).length
}

export function checklistPct(wo: WorkOrder): number {
  if (wo.checklist.length === 0) return 0
  return (checklistDone(wo) / wo.checklist.length) * 100
}
