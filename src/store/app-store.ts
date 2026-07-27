/**
 * App store — plain React context + useReducer.
 *
 * zustand is not installed and we are not adding dependencies. This is all the
 * demo needs: one reducer, one provider, one hook. Every screen reads the same
 * state object, so a mutation on the Tasks screen is instantly visible on the
 * Dashboard badge, the Copilot list and the asset passport.
 *
 * Usage:
 *   // src/app/_layout.tsx
 *   <AppStoreProvider>...</AppStoreProvider>
 *
 *   // any screen
 *   const { workOrders, setWorkOrderStatus } = useAppStore()
 */

import { createContext, createElement, useContext, useMemo, useReducer, type ReactNode } from 'react'

import {
  ACTIVITY,
  ALERTS,
  ASSETS,
  KPIS,
  LEASES,
  MONTHLY_TREND,
  NOW,
  TECHNICIANS,
  WORK_ORDERS,
  computeSlaStatus,
} from '@/data/mock'
import type {
  ActivityItem,
  Asset,
  CopilotAlert,
  Kpi,
  LeaseSummary,
  MonthlyTrend,
  NewWorkOrderInput,
  Priority,
  Technician,
  WorkOrder,
  WorkOrderStatus,
} from '@/lib/types'

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface AppState {
  assets: Asset[]
  workOrders: WorkOrder[]
  alerts: CopilotAlert[]
  technicians: Technician[]
  leases: LeaseSummary[]
  kpis: Kpi[]
  activity: ActivityItem[]
  monthlyTrend: MonthlyTrend[]
}

function initialState(): AppState {
  return {
    assets: ASSETS,
    workOrders: WORK_ORDERS,
    alerts: ALERTS,
    technicians: TECHNICIANS,
    leases: LEASES,
    kpis: KPIS,
    activity: ACTIVITY,
    monthlyTrend: MONTHLY_TREND,
  }
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

type Action =
  | { type: 'set-wo-status'; id: string; status: WorkOrderStatus }
  | { type: 'complete-checklist-item'; woId: string; itemId: string; done: boolean }
  | { type: 'acknowledge-alert'; id: string }
  | { type: 'dismiss-alert'; id: string }
  | { type: 'add-work-order'; input: NewWorkOrderInput }
  | { type: 'reset' }

const LIVE_STATUSES: readonly WorkOrderStatus[] = [
  'Open',
  'Assigned',
  'In Progress',
  'On Hold',
  'Pending Parts',
  'Pending Verification',
]

const SLA_HOURS_BY_PRIORITY: Record<Priority, number> = {
  'P1 - Critical': 4,
  'P2 - High': 24,
  'P3 - Medium': 72,
  'P4 - Low': 168,
}

const DEFAULT_CHECKLIST = [
  'Isolate and make safe',
  'Diagnose fault',
  'Replace faulty component',
  'Function test',
  'Housekeeping and handover',
]

function recountTechnicians(technicians: Technician[], workOrders: WorkOrder[]): Technician[] {
  const live = new Set(LIVE_STATUSES)
  return technicians.map((t) => ({
    ...t,
    openJobs: workOrders.filter((w) => w.assignedTo === t.name && live.has(w.status)).length,
  }))
}

/** Keep the "Open Work Orders" KPI honest as the demo user closes jobs. */
function refreshOpenWorkOrderKpi(kpis: Kpi[], workOrders: WorkOrder[]): Kpi[] {
  const live = new Set(LIVE_STATUSES)
  const open = workOrders.filter((w) => live.has(w.status)).length
  return kpis.map((k) => (k.id === 'kpi-open-wo' ? { ...k, value: String(open), raw: open } : k))
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'set-wo-status': {
      const now = new Date()
      const workOrders = state.workOrders.map((w) => {
        if (w.id !== action.id || w.status === action.status) return w
        const closing = action.status === 'Closed'
        const completedAt = closing ? now.toISOString() : undefined
        return {
          ...w,
          status: action.status,
          completedAt,
          slaStatus: computeSlaStatus(new Date(w.raisedAt), new Date(w.slaDueAt), closing ? now : undefined),
          actualCost: closing ? (w.actualCost ?? w.estimatedCost) : w.actualCost,
          checklist: closing ? w.checklist.map((c) => ({ ...c, done: true })) : w.checklist,
          history: [
            ...w.history,
            {
              at: now.toISOString(),
              actor: w.assignedTo === 'Unassigned' ? w.raisedBy : w.assignedTo,
              action: `Status changed to ${action.status}`,
              note: 'Updated from the One Asset field app.',
            },
          ],
        }
      })
      return {
        ...state,
        workOrders,
        technicians: recountTechnicians(state.technicians, workOrders),
        kpis: refreshOpenWorkOrderKpi(state.kpis, workOrders),
      }
    }

    case 'complete-checklist-item': {
      const workOrders = state.workOrders.map((w) => {
        if (w.id !== action.woId) return w
        const checklist = w.checklist.map((c) => (c.id === action.itemId ? { ...c, done: action.done } : c))
        // Ticking the first item moves an untouched job into progress — the
        // little bit of state machine the demo needs to feel alive.
        const shouldStart = action.done && (w.status === 'Open' || w.status === 'Assigned')
        return { ...w, checklist, status: shouldStart ? ('In Progress' as WorkOrderStatus) : w.status }
      })
      return {
        ...state,
        workOrders,
        technicians: recountTechnicians(state.technicians, workOrders),
        kpis: refreshOpenWorkOrderKpi(state.kpis, workOrders),
      }
    }

    case 'acknowledge-alert':
      return {
        ...state,
        alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, acknowledged: true } : a)),
      }

    case 'dismiss-alert':
      return {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === action.id ? { ...a, dismissed: true, acknowledged: true } : a,
        ),
      }

    case 'add-work-order': {
      const { input } = action
      const asset = state.assets.find((a) => a.id === input.assetId)
      if (!asset) return state

      const now = new Date()
      const priority = input.priority ?? 'P3 - Medium'
      const slaHours = input.slaHours ?? SLA_HOURS_BY_PRIORITY[priority]
      const slaDueAt = new Date(now.getTime() + slaHours * 3_600_000)
      const seq = state.workOrders.length + 1
      const raisedBy = input.raisedBy ?? 'Pegawai Lapangan KDH'
      const assignedTo = input.assignedTo ?? 'Unassigned'

      const created: WorkOrder = {
        id: `WO-NEW-${seq}`,
        code: `WO-${now.getFullYear()}-${String(900 + seq).padStart(4, '0')}`,
        assetId: asset.id,
        assetName: asset.name,
        assetCode: asset.code,
        zone: asset.zone,
        title: input.title,
        description:
          input.description ??
          'Raised from the One Asset field app after an on-site QR scan. Photographs attached to the asset record.',
        type: input.type ?? 'Corrective',
        priority,
        status: assignedTo === 'Unassigned' ? 'Open' : 'Assigned',
        source: input.source ?? 'QR Scan',
        raisedBy,
        raisedAt: now.toISOString(),
        assignedTo,
        slaHours,
        slaDueAt: slaDueAt.toISOString(),
        slaStatus: computeSlaStatus(now, slaDueAt),
        estimatedCost: input.estimatedCost ?? 1_200,
        checklist: DEFAULT_CHECKLIST.map((label, i) => ({
          id: `CHK-NEW-${seq}-${i + 1}`,
          label,
          done: false,
        })),
        history: [
          {
            at: now.toISOString(),
            actor: raisedBy,
            action: 'Work order raised',
            note: `Logged via ${input.source ?? 'QR Scan'} on the field app.`,
          },
        ],
        isUserAdded: true,
      }

      const workOrders = [created, ...state.workOrders]
      const activity: ActivityItem[] = [
        {
          id: `ACT-NEW-${seq}`,
          at: now.toISOString(),
          actor: raisedBy,
          action: 'Raised work order from the field',
          detail: `${created.code} — ${created.title} at ${asset.name}`,
          kind: 'work-order',
          entityId: created.id,
        },
        ...state.activity,
      ]

      return {
        ...state,
        workOrders,
        activity,
        technicians: recountTechnicians(state.technicians, workOrders),
        kpis: refreshOpenWorkOrderKpi(state.kpis, workOrders),
      }
    }

    case 'reset':
      return initialState()

    default:
      return state
  }
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export interface AppStore extends AppState {
  /** The dataset's clock reference — every mock date is an offset from this. */
  now: Date

  /* --- derived, recomputed on every state change --- */
  /** Work orders that are neither Closed nor Cancelled. Drives the Tasks badge. */
  openWorkOrders: WorkOrder[]
  /** Alerts that are neither acknowledged nor dismissed. Drives the Copilot badge. */
  unacknowledgedAlerts: CopilotAlert[]
  /** Alerts still worth showing (not dismissed). */
  visibleAlerts: CopilotAlert[]

  /* --- lookups --- */
  getAsset: (id: string) => Asset | undefined
  getAssetByCode: (code: string) => Asset | undefined
  getWorkOrder: (id: string) => WorkOrder | undefined
  workOrdersForAsset: (assetId: string) => WorkOrder[]

  /* --- mutations --- */
  setWorkOrderStatus: (id: string, status: WorkOrderStatus) => void
  completeChecklistItem: (woId: string, itemId: string, done: boolean) => void
  acknowledgeAlert: (id: string) => void
  dismissAlert: (id: string) => void
  addWorkOrder: (input: NewWorkOrderInput) => void
  resetDemo: () => void
}

const AppStoreContext = createContext<AppStore | null>(null)

export interface AppStoreProviderProps {
  children: ReactNode
}

export function AppStoreProvider({ children }: AppStoreProviderProps) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  const value = useMemo<AppStore>(() => {
    const live = new Set(LIVE_STATUSES)
    const assetIndex = new Map(state.assets.map((a) => [a.id, a]))
    const codeIndex = new Map(state.assets.map((a) => [a.code, a]))
    const woIndex = new Map(state.workOrders.map((w) => [w.id, w]))

    return {
      ...state,
      now: NOW,
      openWorkOrders: state.workOrders.filter((w) => live.has(w.status)),
      unacknowledgedAlerts: state.alerts.filter((a) => !a.acknowledged && !a.dismissed),
      visibleAlerts: state.alerts.filter((a) => !a.dismissed),

      getAsset: (id) => assetIndex.get(id),
      getAssetByCode: (code) => codeIndex.get(code),
      getWorkOrder: (id) => woIndex.get(id),
      workOrdersForAsset: (assetId) => state.workOrders.filter((w) => w.assetId === assetId),

      setWorkOrderStatus: (id, status) => dispatch({ type: 'set-wo-status', id, status }),
      completeChecklistItem: (woId, itemId, done) =>
        dispatch({ type: 'complete-checklist-item', woId, itemId, done }),
      acknowledgeAlert: (id) => dispatch({ type: 'acknowledge-alert', id }),
      dismissAlert: (id) => dispatch({ type: 'dismiss-alert', id }),
      addWorkOrder: (input) => dispatch({ type: 'add-work-order', input }),
      resetDemo: () => dispatch({ type: 'reset' }),
    }
  }, [state])

  return createElement(AppStoreContext.Provider, { value }, children)
}

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext)
  if (!ctx) throw new Error('useAppStore must be used inside <AppStoreProvider>')
  return ctx
}
