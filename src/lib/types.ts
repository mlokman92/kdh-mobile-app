/**
 * KDH One Asset — Mobile domain contract.
 *
 * A deliberately TRIMMED port of the web console's `src/lib/types.ts`. Field
 * names are identical to the web wherever they overlap so the two products
 * read as one system; the nested `location` / `landTitle` / `building` /
 * `insurance` objects are flattened onto `Asset` because the mobile screens
 * never need the full record.
 *
 * No `enum` anywhere — `as const` arrays plus derived unions, exactly like web.
 */

/* ------------------------------------------------------------------ */
/* Enumerations (as const arrays + derived unions)                     */
/* ------------------------------------------------------------------ */

export const ASSET_CATEGORIES = [
  'Commercial Property',
  'Industrial',
  'Land',
  'Tourism & Hospitality',
  'Infrastructure',
  'Building & Facility',
  'Plant & Equipment',
  'ICT & Digital',
] as const
export type AssetCategory = (typeof ASSET_CATEGORIES)[number]

export const ASSET_STATUSES = [
  'Active',
  'Leased',
  'Vacant',
  'Under Maintenance',
  'Under Construction',
  'Idle',
  'Disposed',
] as const
export type AssetStatus = (typeof ASSET_STATUSES)[number]

export const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'] as const
export type Condition = (typeof CONDITIONS)[number]

export const CRITICALITIES = ['Critical', 'High', 'Medium', 'Low'] as const
export type Criticality = (typeof CRITICALITIES)[number]

export const OWNERSHIP_TYPES = ['Owned', 'Leased-in', 'Joint Venture', 'Trust / Custodian'] as const
export type OwnershipType = (typeof OWNERSHIP_TYPES)[number]

export const TENURES = ['Freehold', 'Leasehold 99yr', 'Leasehold 66yr', 'Leasehold 30yr'] as const
export type Tenure = (typeof TENURES)[number]

export const WO_TYPES = [
  'Corrective',
  'Preventive',
  'Predictive',
  'Inspection',
  'Statutory Compliance',
  'Emergency',
  'Upgrade / Improvement',
] as const
export type WorkOrderType = (typeof WO_TYPES)[number]

export const WO_STATUSES = [
  'Open',
  'Assigned',
  'In Progress',
  'On Hold',
  'Pending Parts',
  'Pending Verification',
  'Closed',
  'Cancelled',
] as const
export type WorkOrderStatus = (typeof WO_STATUSES)[number]

/** Statuses that still consume field capacity — drives the Tasks tab badge. */
export const OPEN_WO_STATUSES = [
  'Open',
  'Assigned',
  'In Progress',
  'On Hold',
  'Pending Parts',
  'Pending Verification',
] as const satisfies readonly WorkOrderStatus[]

export function isOpenWorkOrder(status: WorkOrderStatus): boolean {
  return status !== 'Closed' && status !== 'Cancelled'
}

export const PRIORITIES = ['P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low'] as const
export type Priority = (typeof PRIORITIES)[number]

export const SLA_STATUSES = ['Met', 'On Track', 'At Risk', 'Breached'] as const
export type SlaStatus = (typeof SLA_STATUSES)[number]

export const WO_SOURCES = [
  'QR Scan',
  'Tenant Portal',
  'Call Centre',
  'IoT Sensor',
  'Scheduled PM',
  'WhatsApp Bot',
  'Inspection Finding',
] as const
export type WorkOrderSource = (typeof WO_SOURCES)[number]

export const LEASE_STATUSES = [
  'Active',
  'Expiring Soon',
  'Expired',
  'Renewal In Progress',
  'Terminated',
  'Draft',
] as const
export type LeaseStatus = (typeof LEASE_STATUSES)[number]

/** KEJORA operational zones across South East Johor. En-dash, same as web. */
export const ZONES = [
  'Zon Desaru–Penawar',
  'Zon Pengerang–Sungai Rengit',
  'Zon Bandar Tenggara',
  'Zon Bandar Mas–Air Tawar',
  'Zon Sedili–Kota Tinggi',
  'Zon Mersing',
] as const
export type Zone = (typeof ZONES)[number]

export const DEPARTMENTS = [
  'Property Management',
  'Facilities & Maintenance',
  'Land & Development',
  'Tourism & Recreation',
  'Industrial Estates',
  'Corporate Services',
  'Finance',
] as const
export type Department = (typeof DEPARTMENTS)[number]

export const ALERT_SEVERITIES = ['critical', 'warning', 'info', 'opportunity'] as const
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number]

export const ALERT_CATEGORIES = [
  'Maintenance Economics',
  'Revenue Leakage',
  'Compliance Risk',
  'Utilisation',
  'Portfolio Strategy',
  'Energy & ESG',
  'Data Quality',
  'Tenancy Risk',
] as const
export type AlertCategory = (typeof ALERT_CATEGORIES)[number]

export const INTENTS = ['positive', 'negative', 'neutral', 'warning'] as const
export type Intent = (typeof INTENTS)[number]

/**
 * Theme-token derived tints used to paint the generated hero banner on the
 * asset passport. Resolve to real colours with `tintColor()` from '@/lib/theme'
 * or to a Tailwind class with `PHOTO_TINT_BG` from the same module.
 */
export const PHOTO_TINTS = ['chart1', 'chart2', 'chart3', 'chart4', 'chart5', 'primary'] as const
export type PhotoTint = (typeof PHOTO_TINTS)[number]

export const TIMELINE_KINDS = [
  'Acquisition',
  'Valuation',
  'Inspection',
  'Maintenance',
  'Lease',
  'Compliance',
  'Incident',
  'Upgrade',
] as const
export type TimelineKind = (typeof TIMELINE_KINDS)[number]

export const DOCUMENT_TYPES = [
  'Title Deed',
  'Valuation Report',
  'Insurance',
  'Warranty',
  'Permit',
  'Floor Plan',
  'Photo',
  'Contract',
] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

/* ------------------------------------------------------------------ */
/* Core entities                                                       */
/* ------------------------------------------------------------------ */

export interface GeoPoint {
  lat: number
  lng: number
}

export interface AssetDocument {
  id: string
  name: string
  type: DocumentType
  /** ISO date */
  uploadedAt: string
  sizeKb: number
}

/** One dot on the asset passport's life-story rail. */
export interface TimelineEvent {
  id: string
  /** ISO datetime */
  at: string
  kind: TimelineKind
  title: string
  detail?: string
  actor?: string
}

export interface Asset {
  id: string
  /** Human readable, e.g. KDH-CP-0042 */
  code: string
  name: string
  category: AssetCategory
  subCategory: string
  status: AssetStatus
  condition: Condition
  /** 0–100 */
  conditionScore: number
  criticality: Criticality
  /* --- location (flattened from the web's AssetLocation) --- */
  zone: Zone
  town: string
  district: string
  address: string
  lat: number
  lng: number
  /* --- finance --- */
  /** ISO date */
  acquisitionDate: string
  acquisitionCost: number
  currentValue: number
  netBookValue: number
  /* --- custody & title --- */
  custodianName: string
  custodianDepartment: Department
  ownership: OwnershipType
  tenure: Tenure
  titleNo: string
  lotNo: string
  mukim: string
  areaHectares?: number
  grossFloorAreaSqft?: number
  yearBuilt?: number
  /* --- insurance --- */
  insurerName?: string
  /** ISO date */
  insuranceExpiry?: string
  sumInsured?: number
  /* --- inspection --- */
  /** ISO date */
  lastInspection?: string
  /** ISO date */
  nextInspection?: string
  /* --- performance --- */
  /** 0–100 utilisation / occupancy */
  utilisationRate: number
  revenueYtd: number
  /** 0–100, higher = riskier */
  riskScore: number
  /** 0–100 completeness of the record */
  dataQualityScore: number
  /** Payload encoded in the printed QR label. */
  qrPayload: string
  tags: string[]
  documents: AssetDocument[]
  timeline: TimelineEvent[]
  photoTint: PhotoTint
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface WorkOrderEvent {
  /** ISO datetime */
  at: string
  actor: string
  action: string
  note?: string
}

export interface WorkOrder {
  id: string
  /** e.g. WO-2026-0148 */
  code: string
  assetId: string
  assetName: string
  assetCode: string
  zone: Zone
  title: string
  description: string
  type: WorkOrderType
  priority: Priority
  status: WorkOrderStatus
  source: WorkOrderSource
  raisedBy: string
  /** ISO datetime */
  raisedAt: string
  assignedTo: string
  slaHours: number
  /** ISO datetime */
  slaDueAt: string
  /** ISO datetime */
  completedAt?: string
  slaStatus: SlaStatus
  estimatedCost: number
  actualCost?: number
  checklist: ChecklistItem[]
  history: WorkOrderEvent[]
  /** True for work orders the demo user raised during the session. */
  isUserAdded?: boolean
}

/** Flattened lease row — enough for the mobile leasing strip. */
export interface LeaseSummary {
  id: string
  unitNo: string
  propertyName: string
  tenantName: string
  monthlyRent: number
  /** ISO date */
  endDate: string
  status: LeaseStatus
  outstandingAmount: number
}

export interface CopilotAlert {
  id: string
  severity: AlertSeverity
  category: AlertCategory
  title: string
  /** What the model observed. */
  insight: string
  /** What it wants a human to do about it. */
  recommendation: string
  /** 0–100 */
  confidence: number
  assetId?: string
  assetName?: string
  workOrderId?: string
  /** Ringgit impact of acting on the recommendation. */
  valueImpact?: number
  /** Which systems the insight was drawn from. */
  sources: string[]
  /** ISO datetime */
  raisedAt: string
  acknowledged: boolean
  dismissed: boolean
}

export interface Technician {
  id: string
  name: string
  team: string
  zone: Zone
  openJobs: number
  /** 0–100 */
  utilisation: number
  initials: string
}

export interface Kpi {
  id: string
  label: string
  /** Display-ready value, already formatted (e.g. "RM 1.84b", "94.2"). */
  value: string
  /** Suffix rendered after the value, e.g. "%" or "assets". Empty when none. */
  unit: string
  /** Underlying number, for charts that need the raw magnitude. */
  raw: number
  /** Period-on-period change, in percent. Negative = down. */
  delta: number
  intent: Intent
  /** 12 points, oldest first. */
  spark: number[]
}

/** Recent-activity feed row on the dashboard. */
export interface ActivityItem {
  id: string
  /** ISO datetime */
  at: string
  actor: string
  action: string
  detail: string
  kind: 'work-order' | 'asset' | 'lease' | 'inspection' | 'payment' | 'alert'
  /** Optional deep-link target (asset id or work order id). */
  entityId?: string
}

/** Twelve-month roll-up powering the dashboard trend chart. */
export interface MonthlyTrend {
  /** YYYY-MM */
  period: string
  /** Short label, e.g. "Jan" */
  label: string
  revenue: number
  target: number
  collections: number
  maintenanceSpend: number
}

/** Payload accepted by `addWorkOrder()` on the app store. */
export interface NewWorkOrderInput {
  assetId: string
  title: string
  description?: string
  type?: WorkOrderType
  priority?: Priority
  source?: WorkOrderSource
  raisedBy?: string
  assignedTo?: string
  slaHours?: number
  estimatedCost?: number
}
