/* =====================================================================================
 * KDH One Asset — Mobile demo dataset
 * -------------------------------------------------------------------------------------
 * Kejora Development Holding Sdn Bhd (KDH), the corporate arm of Lembaga Kemajuan
 * Johor Tenggara (KEJORA). Everything below is synthetic but internally consistent:
 *
 *   • A single mulberry32 PRNG drives every draw, so the dataset is byte-identical
 *     on every launch. There is no Math.random in this file.
 *   • Every date is derived as an offset from NOW, so the demo always looks current.
 *   • Referential integrity is enforced by construction — work orders point at real
 *     assets and carry that asset's name/code/zone; every alert with an assetId
 *     resolves; technician open-job counts are recomputed from WORK_ORDERS.
 *
 * Volumes are deliberately small (48 assets, not the web console's 240): this is a
 * phone, and every screen should feel instant.
 * ===================================================================================== */

import { formatMYRCompact, initials } from '@/lib/format'
import { MAP_BOUNDS, TOWNS, type TownMarker } from '@/lib/geo'
import type {
  ActivityItem,
  Asset,
  AssetCategory,
  AssetDocument,
  AssetStatus,
  ChecklistItem,
  Condition,
  CopilotAlert,
  Criticality,
  Department,
  DocumentType,
  Kpi,
  LeaseStatus,
  LeaseSummary,
  MonthlyTrend,
  OwnershipType,
  PhotoTint,
  Priority,
  SlaStatus,
  Technician,
  Tenure,
  TimelineEvent,
  WorkOrder,
  WorkOrderEvent,
  WorkOrderSource,
  WorkOrderStatus,
  WorkOrderType,
  Zone,
} from '@/lib/types'

/* =====================================================================================
 * 1. Deterministic PRNG + primitives
 * ===================================================================================== */

/** mulberry32 — tiny, fast, fully deterministic. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The one and only entropy source in this file. Seed = "KDH1" in hex. */
const rnd = mulberry32(0x4b444831)

/** Random float in [min, max). */
function rf(min: number, max: number): number {
  return min + rnd() * (max - min)
}

/** Random integer in [min, max] inclusive. */
function ri(min: number, max: number): number {
  return Math.floor(min + rnd() * (max - min + 1))
}

/** Skewed draw — power > 1 clusters towards `min`. */
function skew(min: number, max: number, power: number): number {
  return min + Math.pow(rnd(), power) * (max - min)
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)]
}

function chance(p: number): boolean {
  return rnd() < p
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length))
}

interface WeightedOption<T> {
  v: T
  w: number
}

function weighted<T>(options: readonly WeightedOption<T>[]): T {
  let total = 0
  for (const o of options) total += o.w
  let r = rnd() * total
  for (const o of options) {
    r -= o.w
    if (r <= 0) return o.v
  }
  return options[options.length - 1].v
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0')
}

/* =====================================================================================
 * 2. Time anchor — everything is an offset from NOW
 * ===================================================================================== */

/** Single clock reference for the whole dataset. */
export const NOW = new Date()

const MS_HOUR = 3_600_000
const MS_DAY = 86_400_000

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function dateHoursFromNow(h: number): Date {
  return new Date(NOW.getTime() + h * MS_HOUR)
}

function dateDaysFromNow(d: number): Date {
  return new Date(NOW.getTime() + d * MS_DAY)
}

/** ISO datetime `n` hours from now (negative = past). */
function isoHoursFromNow(h: number): string {
  return dateHoursFromNow(h).toISOString()
}

/** ISO datetime `n` days from now (negative = past). */
function isoDaysFromNow(d: number): string {
  return dateDaysFromNow(d).toISOString()
}

/** Local calendar date as `YYYY-MM-DD` — avoids UTC drift on date-only fields. */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`
}

function dayFromNow(n: number): string {
  return ymd(dateDaysFromNow(n))
}

function yearFromNow(n: number): string {
  return dayFromNow(n * 365.25)
}

function monthStart(offset: number): Date {
  return new Date(NOW.getFullYear(), NOW.getMonth() + offset, 1)
}

/* =====================================================================================
 * 3. Name pools — hand curated so nothing reads as synthetic
 * ===================================================================================== */

const STAFF_NAMES = [
  'Zulkifli bin Rahman',
  'Nurul Aina binti Hassan',
  'Ganesan a/l Muthu',
  'Chong Wei Ming',
  'Siti Zubaidah binti Omar',
  'Ravi a/l Subramaniam',
  'Ng Siew Ling',
  'Amirul Hakim bin Yusof',
  'Faridah binti Ismail',
  'Mohd Syafiq bin Anuar',
  'Tan Boon Hock',
  'Kavitha a/p Nagalingam',
  'Rosnah binti Abu Bakar',
  'Hafiz bin Zainuddin',
  'Norhayati binti Salleh',
  'Azman bin Kadir',
  'Wong Mei Fong',
  'Suresh a/l Rajoo',
  'Nor Azlina binti Jaafar',
  'Yap Chee Seng',
] as const

const TECHNICIAN_SEED: readonly (readonly [string, string, Zone])[] = [
  ['Mohd Rizal bin Karim', 'Team Desaru', 'Zon Desaru–Penawar'],
  ['Ravi a/l Subramaniam', 'Team Pengerang', 'Zon Pengerang–Sungai Rengit'],
  ['Lim Chee Keong', 'Team Tenggara', 'Zon Bandar Tenggara'],
  ['Amirul Hakim bin Yusof', 'Team Bandar Mas', 'Zon Bandar Mas–Air Tawar'],
  ['Sivakumar a/l Manickam', 'Team Sedili', 'Zon Sedili–Kota Tinggi'],
  ['Ahmad Syahmi bin Rosli', 'Team Mersing', 'Zon Mersing'],
  ['Tan Wei Jie', 'Team M&E Pusat', 'Zon Desaru–Penawar'],
  ['Mohd Nazrin bin Salleh', 'Team Civil & Struktur', 'Zon Sedili–Kota Tinggi'],
]

/** Which kind of space a tenant plausibly occupies — keeps leases believable. */
type TenantKind = 'retail' | 'stall' | 'office' | 'industrial' | 'tourism'

const TENANT_POOL: readonly (readonly [string, string, TenantKind])[] = [
  ['Kedai Runcit Sri Penawar Sdn Bhd', 'Retail — Grocery', 'retail'],
  ['Restoran Nasi Padang Minang', 'F&B — Restaurant', 'retail'],
  ['Klinik Desa Murni', 'Healthcare', 'retail'],
  ['Ganesan Hardware Trading', 'Hardware & Tools', 'retail'],
  ['Butik Warna Warni', 'Textile & Apparel', 'retail'],
  ['Elektrik Maju Jaya Trading', 'Electrical & Electronics', 'retail'],
  ['Salon Cantik Aisyah', 'Beauty & Wellness', 'retail'],
  ['Farmasi Sihat Bandar Penawar', 'Pharmacy', 'retail'],
  ['Kedai Emas Sri Devi', 'Retail — Jewellery', 'retail'],
  ['Bengkel Kereta Ah Seng', 'Automotive Workshop', 'retail'],
  ['Gerai Nasi Lemak Mak Timah', 'F&B — Stall', 'stall'],
  ['Warung Sate Pak Samad', 'F&B — Stall', 'stall'],
  ['Muthu Curry House', 'F&B — Restaurant', 'stall'],
  ['Syarikat Ikan Segar Sedili Sdn Bhd', 'Fisheries & Seafood', 'stall'],
  ['Gerai Buah Tempatan Hamid', 'F&B — Stall', 'stall'],
  ['Percetakan Setia Jaya Sdn Bhd', 'Printing & Stationery', 'office'],
  ['Pusat Tuisyen Cemerlang Bandar Mas', 'Education & Tuition', 'office'],
  ['Firma Akaun Chong & Co', 'Professional Services', 'office'],
  ['Pejabat Guaman Rahim & Partners', 'Professional Services', 'office'],
  ['Koperasi Kredit Bandar Mas Berhad', 'Financial Services', 'office'],
  ['Pengerang Logistik Sdn Bhd', 'Logistics & Haulage', 'industrial'],
  ['Syarikat Perabot Chin Huat Sdn Bhd', 'Furniture Manufacturing', 'industrial'],
  ['Kilang Plastik Hong Leong Sdn Bhd', 'Plastics Manufacturing', 'industrial'],
  ['Cold Chain Johor Sdn Bhd', 'Cold Storage', 'industrial'],
  ['Gudang Simpanan Tenggara Sdn Bhd', 'Warehousing', 'industrial'],
  ['Petro Support Services Sdn Bhd', 'Petrochemical Support', 'industrial'],
  ['Baja & Benih Tenggara Enterprise', 'Agriculture Supplies', 'industrial'],
  ['Desaru Marine Supplies Sdn Bhd', 'Marine Supplies', 'tourism'],
  ['Desaru Holiday Travel & Tours', 'Tourism & Travel', 'tourism'],
  ['Mersing Island Ferry Services Sdn Bhd', 'Tourism & Travel', 'tourism'],
  ['Desaru Water Sports Adventure', 'Tourism & Travel', 'tourism'],
]

const INSURERS = [
  'MSIG Insurance (Malaysia) Bhd',
  'Etiqa General Insurance Bhd',
  'Allianz General Insurance Company (M) Bhd',
  'Zurich General Insurance Malaysia Bhd',
  'Takaful Ikhlas General Bhd',
  'Lonpac Insurance Bhd',
] as const

const MUKIMS = [
  'Mukim Pantai Timur',
  'Mukim Sedili',
  'Mukim Tenggara',
  'Mukim Pengerang',
  'Mukim Johor Lama',
  'Mukim Kota Tinggi',
  'Mukim Penawar',
  'Mukim Mersing',
  'Mukim Jemaluang',
  'Mukim Padang Endau',
  'Mukim Tanjung Surat',
] as const

const STREETS = [
  'Jalan Utama',
  'Jalan Dagang',
  'Jalan Mawar',
  'Jalan Bunga Raya',
  'Jalan Perdana',
  'Jalan Sentosa',
  'Jalan Bakti',
  'Jalan Kenari',
  'Jalan Melur',
  'Jalan Seri Impian',
] as const

const POSTCODES: Record<string, string> = {
  'Bandar Penawar': '81930',
  Desaru: '81930',
  'Tanjung Balau': '81930',
  'Felda Adela': '81900',
  'Sungai Rengit': '81620',
  Pengerang: '81600',
  'Teluk Ramunia': '81620',
  'Bandar Tenggara': '81440',
  'Bandar Baru Kangkar Pulai': '81300',
  'Felda Taib Andak': '81000',
  'Bandar Mas': '81900',
  'Air Tawar': '81900',
  'Felda Air Tawar 5': '81900',
  'Kota Tinggi': '81900',
  'Sedili Besar': '81907',
  'Sedili Kecil': '81907',
  'Bandar Easter': '81900',
  Mersing: '86800',
  Endau: '86900',
  Jemaluang: '86810',
  Tenglu: '86800',
}

const TAG_POOL = [
  'Income Generating',
  'Strategic Land',
  'Revenue Anchor',
  'High Footfall',
  'Coastal Exposure',
  'Flood Watch',
  'Solar Ready',
  'Statutory Inspection',
  'Zone Flagship',
  'Disposal Candidate',
  'Community Asset',
  'Tourism Corridor',
  'Industrial Corridor',
] as const

const PHOTO_TINT_POOL: readonly PhotoTint[] = ['chart1', 'chart2', 'chart3', 'chart4', 'chart5', 'primary']

/* =====================================================================================
 * 4. Category configuration
 * ===================================================================================== */

const CATEGORY_CODE: Record<AssetCategory, string> = {
  'Commercial Property': 'CP',
  Industrial: 'IN',
  Land: 'LD',
  'Tourism & Hospitality': 'TH',
  Infrastructure: 'IF',
  'Building & Facility': 'BF',
  'Plant & Equipment': 'PE',
  'ICT & Digital': 'IT',
}

const CATEGORY_DEPARTMENT: Record<AssetCategory, Department> = {
  'Commercial Property': 'Property Management',
  Industrial: 'Industrial Estates',
  Land: 'Land & Development',
  'Tourism & Hospitality': 'Tourism & Recreation',
  Infrastructure: 'Facilities & Maintenance',
  'Building & Facility': 'Facilities & Maintenance',
  'Plant & Equipment': 'Facilities & Maintenance',
  'ICT & Digital': 'Corporate Services',
}

interface CategoryEconomics {
  costMin: number
  costMax: number
  costSkew: number
  usefulLife: number
  ageMin: number
  ageMax: number
  appreciates: boolean
  /** Relative income yield used to apportion group revenue. */
  yieldFactor: number
}

const CATEGORY_ECON: Record<AssetCategory, CategoryEconomics> = {
  'Commercial Property': { costMin: 2_400_000, costMax: 21_000_000, costSkew: 1.5, usefulLife: 50, ageMin: 3, ageMax: 31, appreciates: true, yieldFactor: 1.0 },
  Industrial: { costMin: 2_400_000, costMax: 17_000_000, costSkew: 1.4, usefulLife: 40, ageMin: 3, ageMax: 28, appreciates: true, yieldFactor: 0.9 },
  Land: { costMin: 1_200_000, costMax: 21_000_000, costSkew: 1.6, usefulLife: 99, ageMin: 6, ageMax: 34, appreciates: true, yieldFactor: 0.18 },
  'Tourism & Hospitality': { costMin: 3_500_000, costMax: 27_000_000, costSkew: 1.3, usefulLife: 40, ageMin: 3, ageMax: 26, appreciates: true, yieldFactor: 1.15 },
  Infrastructure: { costMin: 900_000, costMax: 17_000_000, costSkew: 1.6, usefulLife: 30, ageMin: 4, ageMax: 30, appreciates: false, yieldFactor: 0.12 },
  'Building & Facility': { costMin: 700_000, costMax: 11_000_000, costSkew: 1.5, usefulLife: 40, ageMin: 4, ageMax: 32, appreciates: false, yieldFactor: 0.2 },
  'Plant & Equipment': { costMin: 120_000, costMax: 3_200_000, costSkew: 1.7, usefulLife: 10, ageMin: 1, ageMax: 12, appreciates: false, yieldFactor: 0.1 },
  'ICT & Digital': { costMin: 60_000, costMax: 2_000_000, costSkew: 1.7, usefulLife: 5, ageMin: 1, ageMax: 7, appreciates: false, yieldFactor: 0.05 },
}

/** 48 assets across the eight categories. */
const CATEGORY_PLAN: readonly (readonly [AssetCategory, number])[] = [
  ['Commercial Property', 10],
  ['Industrial', 6],
  ['Land', 6],
  ['Tourism & Hospitality', 6],
  ['Infrastructure', 5],
  ['Building & Facility', 8],
  ['Plant & Equipment', 5],
  ['ICT & Digital', 2],
]

interface Blueprint {
  sub: string
  make: (town: TownMarker, seq: number) => string
  w: number
  hasBuilding: boolean
  hasLand: boolean
}

const FACTORY_TRADES = ['Perabot', 'Plastik', 'Getah', 'Makanan', 'Logam', 'Pemprosesan Sawit'] as const
const SURAU_NAMES = ['Al-Hidayah', 'An-Nur', 'Al-Ikhlas', 'At-Taqwa', 'Al-Falah'] as const
const BLOCK_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

const BLUEPRINTS: Record<AssetCategory, readonly Blueprint[]> = {
  'Commercial Property': [
    { sub: 'Retail Complex', w: 14, hasBuilding: true, hasLand: true, make: (t) => `Kompleks Niaga ${t.name}` },
    { sub: 'Shophouse Row', w: 18, hasBuilding: true, hasLand: true, make: (t) => `Rumah Kedai 2 Tingkat ${pick(STREETS)} ${t.name}` },
    { sub: 'Public Market', w: 12, hasBuilding: true, hasLand: true, make: (t) => `Pasar Awam ${t.name}` },
    { sub: 'Food Court', w: 12, hasBuilding: true, hasLand: true, make: (t) => `Medan Selera ${t.name}` },
    { sub: 'Business Arcade', w: 10, hasBuilding: true, hasLand: true, make: (t) => `Arked Niaga ${t.name}` },
    { sub: 'Commercial Centre', w: 16, hasBuilding: true, hasLand: true, make: (t) => `Pusat Perniagaan ${t.name}` },
    { sub: 'Night Bazaar', w: 8, hasBuilding: true, hasLand: true, make: (t) => `Bazar Karat ${t.name}` },
  ],
  Industrial: [
    { sub: 'Light Industrial Lot', w: 20, hasBuilding: true, hasLand: true, make: (t, n) => `Lot Perindustrian PTD ${1200 + n * 7} Kawasan Perindustrian ${t.name}` },
    { sub: 'Factory Building', w: 18, hasBuilding: true, hasLand: true, make: (t, n) => `Kilang ${pick(FACTORY_TRADES)} Lot ${8 + (n % 22)} Kawasan Perindustrian ${t.name}` },
    { sub: 'Warehouse', w: 16, hasBuilding: true, hasLand: true, make: (t) => `Gudang Berhawa Dingin ${t.name}` },
    { sub: 'Logistics Hub', w: 10, hasBuilding: true, hasLand: true, make: (t) => `Pusat Logistik & Pengedaran ${t.name}` },
    { sub: 'Workshop Block', w: 12, hasBuilding: true, hasLand: true, make: (t) => `Blok Bengkel Sederhana ${t.name}` },
  ],
  Land: [
    { sub: 'Oil Palm Estate', w: 22, hasBuilding: false, hasLand: true, make: (t, n) => `Ladang Kelapa Sawit ${t.name} Blok ${1 + (n % 9)}` },
    { sub: 'Development Land', w: 20, hasBuilding: false, hasLand: true, make: (t, n) => `Tanah Pembangunan ${t.name} Fasa ${1 + (n % 5)}` },
    { sub: 'Agricultural Reserve', w: 14, hasBuilding: false, hasLand: true, make: (t, n) => `Tanah Rizab Pertanian ${t.name} Lot ${2100 + n * 11}` },
    { sub: 'Strategic Land Bank', w: 16, hasBuilding: false, hasLand: true, make: (t) => `Bank Tanah Strategik ${t.name}` },
    { sub: 'Mixed Development Site', w: 14, hasBuilding: false, hasLand: true, make: (t) => `Tapak Pembangunan Bercampur ${t.name}` },
  ],
  'Tourism & Hospitality': [
    { sub: 'Resort Chalets', w: 22, hasBuilding: true, hasLand: true, make: (t, n) => `Chalet Peranginan ${t.name} Blok ${BLOCK_LETTERS[n % BLOCK_LETTERS.length]}` },
    { sub: 'Recreation Centre', w: 14, hasBuilding: true, hasLand: true, make: (t) => `Pusat Rekreasi ${t.name}` },
    { sub: 'Tourism Complex', w: 14, hasBuilding: true, hasLand: true, make: (t) => `Kompleks Pelancongan ${t.name}` },
    { sub: 'Homestay Cluster', w: 16, hasBuilding: true, hasLand: true, make: (t) => `Homestay Kampung ${t.name}` },
    { sub: 'Marine Tourism Facility', w: 12, hasBuilding: true, hasLand: true, make: (t) => `Pusat Pelancongan Marin ${t.name}` },
  ],
  Infrastructure: [
    { sub: 'Fishing Jetty', w: 14, hasBuilding: false, hasLand: true, make: (t) => `Jeti Nelayan ${t.name}` },
    { sub: 'Water Treatment Plant', w: 10, hasBuilding: true, hasLand: true, make: (t) => `Loji Rawatan Air ${t.name}` },
    { sub: 'Industrial Access Road', w: 14, hasBuilding: false, hasLand: true, make: (t, n) => `Jalan Perusahaan ${t.name} Fasa ${1 + (n % 4)}` },
    { sub: 'Bus Terminal', w: 12, hasBuilding: true, hasLand: true, make: (t) => `Terminal Bas ${t.name}` },
    { sub: 'Telecommunications Tower', w: 12, hasBuilding: false, hasLand: true, make: (t) => `Menara Telekomunikasi ${t.name}` },
    { sub: 'Solid Waste Transfer', w: 8, hasBuilding: true, hasLand: true, make: (t) => `Pusat Pemindahan Sisa Pepejal ${t.name}` },
  ],
  'Building & Facility': [
    { sub: 'Community Hall', w: 18, hasBuilding: true, hasLand: true, make: (t) => `Dewan Serbaguna ${t.name}` },
    { sub: 'Surau', w: 12, hasBuilding: true, hasLand: true, make: (t) => `Surau ${pick(SURAU_NAMES)} ${t.name}` },
    { sub: 'Sports Complex', w: 10, hasBuilding: true, hasLand: true, make: (t) => `Kompleks Sukan ${t.name}` },
    { sub: 'Community Centre', w: 12, hasBuilding: true, hasLand: true, make: (t) => `Balai Raya ${t.name}` },
    { sub: 'Zone Office', w: 10, hasBuilding: true, hasLand: true, make: (t) => `Pejabat Zon KEJORA ${t.name}` },
    { sub: 'Staff Quarters', w: 12, hasBuilding: true, hasLand: true, make: (t) => `Rumah Kuarters Pekerja ${t.name}` },
    { sub: 'Public Library', w: 8, hasBuilding: true, hasLand: true, make: (t) => `Perpustakaan Awam ${t.name}` },
    { sub: 'Kindergarten', w: 8, hasBuilding: true, hasLand: true, make: (t) => `Tabika KEMAS ${t.name}` },
  ],
  'Plant & Equipment': [
    { sub: 'Generator Set', w: 16, hasBuilding: false, hasLand: false, make: (t) => `Set Janakuasa Cummins 500kVA — ${t.name}` },
    { sub: 'Central Chiller Plant', w: 14, hasBuilding: false, hasLand: false, make: (t) => `Sistem Penyaman Udara Berpusat — Kompleks ${t.name}` },
    { sub: 'Passenger Lift', w: 12, hasBuilding: false, hasLand: false, make: (t) => `Lif Penumpang Otis — ${t.name}` },
    { sub: 'Refuse Compactor Truck', w: 12, hasBuilding: false, hasLand: false, make: (t, n) => `Lori Sampah Compactor JHK ${4100 + n * 3} — ${t.name}` },
    { sub: 'Water Pump Set', w: 12, hasBuilding: false, hasLand: false, make: (t) => `Pam Air Grundfos — Loji ${t.name}` },
    { sub: 'Fire Alarm System', w: 12, hasBuilding: false, hasLand: false, make: (t) => `Sistem Penggera Kebakaran — ${t.name}` },
  ],
  'ICT & Digital': [
    { sub: 'CCTV & Surveillance', w: 18, hasBuilding: false, hasLand: false, make: (t) => `Sistem CCTV 32-Saluran — ${t.name}` },
    { sub: 'Fibre Network', w: 14, hasBuilding: false, hasLand: false, make: (t) => `Rangkaian Fiber Optik ${t.name}` },
    { sub: 'Digital Service Kiosk', w: 14, hasBuilding: false, hasLand: false, make: (t) => `Kiosk Perkhidmatan Digital ${t.name}` },
    { sub: 'Digital Signage', w: 14, hasBuilding: false, hasLand: false, make: (t) => `Papan Tanda Digital LED ${t.name}` },
  ],
}

/* =====================================================================================
 * 5. Town weighting + geo placement
 * ===================================================================================== */

/**
 * Town weights, balanced so each of the six zones carries a comparable share of
 * the 48 assets — with only 48 pins, a lopsided draw leaves half the map empty.
 * Within a zone the growth centres still outweigh the smaller settlements.
 */
const TOWN_WEIGHTS: Record<string, number> = {
  // Zon Desaru–Penawar (21)
  'Bandar Penawar': 9,
  Desaru: 6,
  'Tanjung Balau': 3,
  'Felda Adela': 3,
  // Zon Pengerang–Sungai Rengit (21)
  'Sungai Rengit': 8,
  Pengerang: 8,
  'Teluk Ramunia': 5,
  // Zon Bandar Tenggara (20)
  'Bandar Tenggara': 9,
  'Bandar Baru Kangkar Pulai': 6,
  'Felda Taib Andak': 5,
  // Zon Bandar Mas–Air Tawar (20)
  'Bandar Mas': 8,
  'Air Tawar': 7,
  'Felda Air Tawar 5': 5,
  // Zon Sedili–Kota Tinggi (20)
  'Kota Tinggi': 7,
  'Sedili Besar': 5,
  'Sedili Kecil': 4,
  'Bandar Easter': 4,
  // Zon Mersing (20)
  Mersing: 8,
  Endau: 4,
  Jemaluang: 4,
  Tenglu: 4,
}

const TOWN_OPTIONS: readonly WeightedOption<TownMarker>[] = TOWNS.map((t) => ({
  v: t,
  w: TOWN_WEIGHTS[t.name] ?? 3,
}))

function townNamed(name: string): TownMarker {
  const t = TOWNS.find((x) => x.name === name)
  if (!t) throw new Error(`Unknown town in mock data: ${name}`)
  return t
}

/** Jitter around a town centre so pins scatter naturally, clamped to MAP_BOUNDS. */
function placeNear(town: TownMarker): { lat: number; lng: number } {
  const m = 0.014
  const lat = clamp(town.lat + rf(-0.02, 0.02), MAP_BOUNDS.minLat + m, MAP_BOUNDS.maxLat - m)
  const lng = clamp(town.lng + rf(-0.02, 0.02), MAP_BOUNDS.minLng + m, MAP_BOUNDS.maxLng - m)
  return { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) }
}

/* =====================================================================================
 * 6. ASSETS — 48 records
 * ===================================================================================== */

interface AssetSpec {
  category: AssetCategory
  sub: string
  name: string
  town: TownMarker
  hasBuilding: boolean
  hasLand: boolean
  /** Hand-placed flagship holdings that the demo script names out loud. */
  featured?: boolean
  criticality?: Criticality
  status?: AssetStatus
}

/**
 * Flagship holdings, hand written. These are the assets the Copilot alerts and
 * the demo narrative refer to by name, so they must exist verbatim.
 */
const FEATURED: readonly AssetSpec[] = [
  { category: 'Commercial Property', sub: 'Retail Complex', name: 'Kompleks Niaga Bandar Penawar', town: townNamed('Bandar Penawar'), hasBuilding: true, hasLand: true, featured: true, criticality: 'Critical', status: 'Leased' },
  { category: 'Commercial Property', sub: 'Office Tower', name: 'Menara KEJORA Bandar Penawar', town: townNamed('Bandar Penawar'), hasBuilding: true, hasLand: true, featured: true, criticality: 'Critical', status: 'Leased' },
  { category: 'Commercial Property', sub: 'Public Market', name: 'Pasar Awam Sungai Rengit', town: townNamed('Sungai Rengit'), hasBuilding: true, hasLand: true, featured: true, criticality: 'High', status: 'Leased' },
  { category: 'Land', sub: 'Oil Palm Estate', name: 'Ladang Kelapa Sawit Air Tawar Blok 7', town: townNamed('Air Tawar'), hasBuilding: false, hasLand: true, featured: true, criticality: 'Medium', status: 'Active' },
  { category: 'Tourism & Hospitality', sub: 'Beach Resort Block', name: 'Desaru Coast Chalet Blok C', town: townNamed('Desaru'), hasBuilding: true, hasLand: true, featured: true, criticality: 'High', status: 'Active' },
  { category: 'Infrastructure', sub: 'Fishing Jetty', name: 'Jeti Nelayan Sedili Besar', town: townNamed('Sedili Besar'), hasBuilding: false, hasLand: true, featured: true, criticality: 'High', status: 'Active' },
  { category: 'Building & Facility', sub: 'Community Hall', name: 'Dewan Serbaguna Felda Adela', town: townNamed('Felda Adela'), hasBuilding: true, hasLand: true, featured: true, criticality: 'Medium', status: 'Active' },
]

function buildSpecs(): AssetSpec[] {
  const specs: AssetSpec[] = []
  const usedNames = new Set<string>()
  for (const [category, total] of CATEGORY_PLAN) {
    const mine = FEATURED.filter((f) => f.category === category)
    for (const f of mine) {
      specs.push(f)
      usedNames.add(f.name)
    }
    const options: readonly WeightedOption<Blueprint>[] = BLUEPRINTS[category].map((b) => ({ v: b, w: b.w }))
    let made = mine.length
    let guard = 0
    while (made < total && guard < 400) {
      guard++
      const bp = weighted(options)
      const town = weighted(TOWN_OPTIONS)
      const name = bp.make(town, specs.length + guard)
      if (usedNames.has(name)) continue
      usedNames.add(name)
      specs.push({ category, sub: bp.sub, name, town, hasBuilding: bp.hasBuilding, hasLand: bp.hasLand })
      made++
    }
  }
  return specs
}

const STATUS_BY_CATEGORY: Record<AssetCategory, readonly WeightedOption<AssetStatus>[]> = {
  'Commercial Property': [{ v: 'Leased', w: 52 }, { v: 'Active', w: 22 }, { v: 'Vacant', w: 12 }, { v: 'Under Maintenance', w: 10 }, { v: 'Under Construction', w: 4 }],
  Industrial: [{ v: 'Leased', w: 48 }, { v: 'Active', w: 26 }, { v: 'Vacant', w: 14 }, { v: 'Under Maintenance', w: 8 }, { v: 'Under Construction', w: 4 }],
  Land: [{ v: 'Active', w: 46 }, { v: 'Leased', w: 26 }, { v: 'Idle', w: 22 }, { v: 'Under Construction', w: 6 }],
  'Tourism & Hospitality': [{ v: 'Active', w: 44 }, { v: 'Leased', w: 28 }, { v: 'Under Maintenance', w: 16 }, { v: 'Vacant', w: 12 }],
  Infrastructure: [{ v: 'Active', w: 68 }, { v: 'Under Maintenance', w: 22 }, { v: 'Under Construction', w: 10 }],
  'Building & Facility': [{ v: 'Active', w: 66 }, { v: 'Under Maintenance', w: 18 }, { v: 'Idle', w: 10 }, { v: 'Vacant', w: 6 }],
  'Plant & Equipment': [{ v: 'Active', w: 62 }, { v: 'Under Maintenance', w: 26 }, { v: 'Idle', w: 12 }],
  'ICT & Digital': [{ v: 'Active', w: 78 }, { v: 'Under Maintenance', w: 16 }, { v: 'Idle', w: 6 }],
}

const CRITICALITY_OPTIONS: readonly WeightedOption<Criticality>[] = [
  { v: 'Critical', w: 12 },
  { v: 'High', w: 26 },
  { v: 'Medium', w: 42 },
  { v: 'Low', w: 20 },
]

const OWNERSHIP_OPTIONS: readonly WeightedOption<OwnershipType>[] = [
  { v: 'Owned', w: 74 },
  { v: 'Joint Venture', w: 12 },
  { v: 'Trust / Custodian', w: 8 },
  { v: 'Leased-in', w: 6 },
]

const TENURE_OPTIONS: readonly WeightedOption<Tenure>[] = [
  { v: 'Leasehold 99yr', w: 46 },
  { v: 'Freehold', w: 30 },
  { v: 'Leasehold 66yr', w: 16 },
  { v: 'Leasehold 30yr', w: 8 },
]

function conditionFromScore(score: number): Condition {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 55) return 'Fair'
  if (score >= 40) return 'Poor'
  return 'Critical'
}

const DOC_TYPES_BY_SHAPE: Record<'land' | 'building' | 'plant', readonly DocumentType[]> = {
  land: ['Title Deed', 'Valuation Report', 'Permit', 'Photo'],
  building: ['Title Deed', 'Valuation Report', 'Insurance', 'Floor Plan', 'Permit', 'Photo', 'Contract'],
  plant: ['Warranty', 'Insurance', 'Contract', 'Permit', 'Photo'],
}

function makeDocuments(assetId: string, spec: AssetSpec): AssetDocument[] {
  const shape = spec.hasBuilding ? 'building' : spec.hasLand ? 'land' : 'plant'
  const types = pickN(DOC_TYPES_BY_SHAPE[shape], ri(3, 5))
  return types.map((type, i) => ({
    id: `${assetId}-doc-${i + 1}`,
    name: `${type} — ${spec.name}`,
    type,
    uploadedAt: dayFromNow(-ri(30, 1400)),
    sizeKb: ri(180, 8400),
  }))
}

function makeTimeline(assetId: string, spec: AssetSpec, acquiredIso: string, custodian: string): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `${assetId}-tl-1`,
      at: new Date(`${acquiredIso}T09:00:00`).toISOString(),
      kind: 'Acquisition',
      title: 'Asset vested to KDH',
      detail: `Transferred from KEJORA land bank and registered under ${CATEGORY_DEPARTMENT[spec.category]}.`,
      actor: 'Pejabat Korporat KDH',
    },
  ]
  const revalAt = -ri(200, 900)
  events.push({
    id: `${assetId}-tl-2`,
    at: isoDaysFromNow(revalAt),
    kind: 'Valuation',
    title: 'Independent revaluation completed',
    detail: 'Market valuation by a registered valuer, filed to the fixed asset register.',
    actor: pick(STAFF_NAMES),
  })
  events.push({
    id: `${assetId}-tl-3`,
    at: isoDaysFromNow(-ri(60, 190)),
    kind: 'Inspection',
    title: 'Condition inspection carried out',
    detail: 'Building condition survey; defects logged against the maintenance plan.',
    actor: custodian,
  })
  if (chance(0.7)) {
    events.push({
      id: `${assetId}-tl-4`,
      at: isoDaysFromNow(-ri(14, 120)),
      kind: 'Maintenance',
      title: 'Scheduled maintenance round closed',
      detail: 'Preventive works completed and verified by the zone facilities team.',
      actor: pick(STAFF_NAMES),
    })
  }
  if (chance(0.45)) {
    events.push({
      id: `${assetId}-tl-5`,
      at: isoDaysFromNow(-ri(5, 60)),
      kind: 'Compliance',
      title: 'Statutory certificate renewed',
      detail: 'BOMBA / DOSH certification renewed and filed to the compliance register.',
      actor: 'Unit Pematuhan KDH',
    })
  }
  if (chance(0.3)) {
    events.push({
      id: `${assetId}-tl-6`,
      at: isoDaysFromNow(-ri(2, 30)),
      kind: 'Incident',
      title: 'Incident reported and made safe',
      detail: 'Reported through the field app; corrective work order raised on the spot.',
      actor: pick(STAFF_NAMES),
    })
  }
  return events.sort((a, b) => (a.at < b.at ? 1 : -1))
}

function buildAssets(): Asset[] {
  const specs = buildSpecs()
  const seqByCategory = new Map<AssetCategory, number>()
  const assets: Asset[] = []

  specs.forEach((spec, index) => {
    const econ = CATEGORY_ECON[spec.category]
    const seq = (seqByCategory.get(spec.category) ?? 0) + 1
    seqByCategory.set(spec.category, seq)

    const code = `KDH-${CATEGORY_CODE[spec.category]}-${pad(seq * 7 + 11, 4)}`
    const id = `AST-${pad(index + 1, 4)}`
    const { lat, lng } = placeNear(spec.town)

    const ageYears = rf(econ.ageMin, econ.ageMax)
    const acquisitionDate = yearFromNow(-ageYears)
    const acquisitionCost = roundTo(skew(econ.costMin, econ.costMax, econ.costSkew), 10_000)

    const growth = econ.appreciates ? Math.pow(1 + rf(0.018, 0.052), ageYears) : 1
    const currentValue = roundTo(acquisitionCost * growth * rf(0.94, 1.1), 10_000)
    const depreciated = econ.appreciates
      ? acquisitionCost * clamp(1 - ageYears / (econ.usefulLife * 1.6), 0.35, 1)
      : acquisitionCost * clamp(1 - ageYears / econ.usefulLife, 0.05, 1)
    const netBookValue = roundTo(Math.max(depreciated, acquisitionCost * 0.05), 1_000)

    const conditionScore = Math.round(clamp(96 - ageYears * rf(0.9, 1.9) + rf(-6, 8), 28, 98))
    const condition = conditionFromScore(conditionScore)
    const criticality = spec.criticality ?? weighted(CRITICALITY_OPTIONS)
    const drawnStatus = weighted(STATUS_BY_CATEGORY[spec.category])
    const status = spec.status ?? drawnStatus

    const custodianName = pick(STAFF_NAMES)
    const ownership = weighted(OWNERSHIP_OPTIONS)
    const tenure = weighted(TENURE_OPTIONS)

    const areaHectares = spec.hasLand ? Number(rf(0.18, spec.category === 'Land' ? 42 : 4.6).toFixed(2)) : undefined
    const grossFloorAreaSqft = spec.hasBuilding ? roundTo(rf(2_200, 74_000), 100) : undefined
    const yearBuilt = spec.hasBuilding ? NOW.getFullYear() - Math.round(ageYears) : undefined

    const insured = spec.hasBuilding || spec.category === 'Plant & Equipment' || chance(0.3)
    const insurerName = insured ? pick(INSURERS) : undefined
    const insuranceExpiry = insured ? dayFromNow(ri(-40, 330)) : undefined
    const sumInsured = insured ? roundTo(currentValue * rf(0.6, 0.95), 10_000) : undefined

    const lastInspection = chance(0.9) ? dayFromNow(-ri(10, 340)) : undefined
    const nextInspection = lastInspection ? dayFromNow(ri(-25, 210)) : undefined

    const utilisationRate =
      status === 'Vacant' || status === 'Idle'
        ? Math.round(rf(0, 24))
        : Math.round(clamp(rf(58, 99) - (condition === 'Poor' || condition === 'Critical' ? 14 : 0), 0, 100))

    const revenueYtd = roundTo(currentValue * econ.yieldFactor * rf(0.014, 0.042) * (utilisationRate / 100), 500)

    const riskScore = Math.round(
      clamp(
        (100 - conditionScore) * 0.55 +
          (criticality === 'Critical' ? 22 : criticality === 'High' ? 14 : criticality === 'Medium' ? 7 : 2) +
          rf(-6, 10),
        4,
        97,
      ),
    )

    const dataQualityScore = Math.round(
      clamp(
        62 +
          (spec.hasLand ? 8 : 0) +
          (insured ? 9 : 0) +
          (lastInspection ? 7 : 0) +
          (spec.featured ? 10 : 0) +
          rf(-14, 14),
        38,
        100,
      ),
    )

    const asset: Asset = {
      id,
      code,
      name: spec.name,
      category: spec.category,
      subCategory: spec.sub,
      status,
      condition,
      conditionScore,
      criticality,
      zone: spec.town.zone,
      town: spec.town.name,
      district: spec.town.district,
      address: `${chance(0.5) ? `No. ${ri(1, 88)}, ` : ''}${pick(STREETS)}, ${POSTCODES[spec.town.name] ?? '81900'} ${spec.town.name}, Johor`,
      lat,
      lng,
      acquisitionDate,
      acquisitionCost,
      currentValue,
      netBookValue,
      custodianName,
      custodianDepartment: CATEGORY_DEPARTMENT[spec.category],
      ownership,
      tenure,
      titleNo: `${chance(0.55) ? 'GRN' : 'HSD'} ${ri(11000, 98000)}`,
      lotNo: `PTD ${ri(1200, 9800)}`,
      mukim: pick(MUKIMS),
      areaHectares,
      grossFloorAreaSqft,
      yearBuilt,
      insurerName,
      insuranceExpiry,
      sumInsured,
      lastInspection,
      nextInspection,
      utilisationRate,
      revenueYtd,
      riskScore,
      dataQualityScore,
      qrPayload: `https://oneasset.kdh.com.my/qr/${code}`,
      tags: pickN(TAG_POOL, ri(2, 4)),
      documents: [],
      timeline: [],
      photoTint: PHOTO_TINT_POOL[index % PHOTO_TINT_POOL.length],
    }
    asset.documents = makeDocuments(id, spec)
    asset.timeline = makeTimeline(id, spec, acquisitionDate, custodianName)
    assets.push(asset)
  })

  return assets
}

export const ASSETS: Asset[] = buildAssets()

const ASSET_BY_ID = new Map(ASSETS.map((a) => [a.id, a]))
const ASSET_BY_CODE = new Map(ASSETS.map((a) => [a.code, a]))
const ASSET_BY_NAME = new Map(ASSETS.map((a) => [a.name, a]))

export function assetById(id: string): Asset | undefined {
  return ASSET_BY_ID.get(id)
}

export function assetByCode(code: string): Asset | undefined {
  return ASSET_BY_CODE.get(code)
}

/** Resolve the asset a scanned QR payload points at. */
export function assetByQrPayload(payload: string): Asset | undefined {
  const trimmed = payload.trim()
  const direct = ASSETS.find((a) => a.qrPayload === trimmed)
  if (direct) return direct
  const tail = trimmed.split('/').pop() ?? ''
  return ASSET_BY_CODE.get(tail.toUpperCase())
}

function named(name: string): Asset {
  const a = ASSET_BY_NAME.get(name)
  if (!a) throw new Error(`Featured asset missing from mock data: ${name}`)
  return a
}

/* =====================================================================================
 * 7. TECHNICIANS — 8 records
 * ===================================================================================== */

export const TECHNICIANS: Technician[] = TECHNICIAN_SEED.map(([name, team, zone], i) => ({
  id: `TEC-${pad(i + 1, 3)}`,
  name,
  team,
  zone,
  openJobs: 0, // recomputed from WORK_ORDERS below
  utilisation: Math.round(rf(58, 96)),
  initials: initials(name),
}))

/* =====================================================================================
 * 8. WORK ORDERS — 34 records
 * ===================================================================================== */

const WO_TITLES: Record<WorkOrderType, readonly string[]> = {
  Corrective: [
    'Air-conditioning unit not cooling',
    'Water leakage at ground floor toilet',
    'Lift stuck between floors',
    'Faulty street lighting at car park',
    'Broken drainage cover at loading bay',
    'Ceiling board collapse after heavy rain',
    'Water pump tripping intermittently',
    'Fire alarm panel showing fault',
    'Roof leakage above lettable unit',
    'CCTV camera offline at main entrance',
    'Clogged grease trap at hawker stalls',
    'Pothole on internal access road',
    'Damaged perimeter fencing',
    'Electrical trip at main switchboard',
  ],
  Preventive: [
    'Quarterly HVAC servicing',
    'Monthly genset load test',
    'Half-yearly fire extinguisher inspection',
    'Annual lift servicing and lubrication',
    'Water tank cleaning and chlorination',
    'Roof gutter and downpipe cleaning',
    'Pump room preventive maintenance',
    'Landscape and grounds upkeep round',
    'Pest control treatment cycle',
  ],
  Predictive: [
    'Vibration analysis on chiller pump',
    'Thermal imaging of main switchboard',
    'IoT sensor anomaly follow-up',
    'Oil sample analysis on generator set',
  ],
  Inspection: [
    'Building condition inspection',
    'Structural crack monitoring survey',
    'Jetty timber decking inspection',
    'Asset verification and QR label check',
  ],
  'Statutory Compliance': [
    'DOSH lift certificate renewal inspection',
    'BOMBA fire certificate renewal',
    'Suruhanjaya Tenaga installation inspection',
    'Water tank certification and testing',
  ],
  Emergency: [
    'Power outage affecting entire block',
    'Burst water main at main access road',
    'Flooding at ground floor car park',
    'Fallen tree blocking access road',
  ],
  'Upgrade / Improvement': [
    'LED lighting retrofit',
    'Solar PV readiness upgrade',
    'CCTV system upgrade to IP cameras',
    'Car park resurfacing and line marking',
  ],
}

const WO_DESCRIPTIONS: Record<WorkOrderType, string> = {
  Corrective: 'Reported by the zone team during a routine walkabout. Area made safe pending permanent repair; parts to be confirmed against the maintenance contract.',
  Preventive: 'Scheduled task from the planned maintenance calendar. Attend on site, complete the checklist, record readings and update the service tag.',
  Predictive: 'Triggered by a trend anomaly in the condition-monitoring data. Capture readings, compare against the baseline and issue a findings note.',
  Inspection: 'Periodic condition inspection required by the asset register. Photograph defects, update the condition score and log findings.',
  'Statutory Compliance': 'Statutory renewal required to keep the asset legally operable. Coordinate with the appointed competent person and file the certificate.',
  Emergency: 'Escalated from the 24-hour hotline. Secure the area, restore temporary service and notify the zone manager immediately.',
  'Upgrade / Improvement': 'Approved improvement works under the zone capital allocation. Confirm scope with the custodian before mobilising.',
}

const CHECKLIST_BY_TYPE: Record<WorkOrderType, readonly string[]> = {
  Corrective: ['Isolate and make safe', 'Diagnose fault', 'Replace faulty component', 'Function test', 'Housekeeping and handover'],
  Preventive: ['Visual inspection', 'Clean and lubricate', 'Tighten terminations', 'Record readings', 'Update service tag'],
  Predictive: ['Attach measurement device', 'Capture baseline readings', 'Compare against trend', 'Issue findings report'],
  Inspection: ['Site walkthrough', 'Photograph defects', 'Update condition score', 'Log findings in register'],
  'Statutory Compliance': ['Notify appointed competent person', 'Witness statutory test', 'Collect certificate', 'File to compliance register'],
  Emergency: ['Secure area and isolate', 'Restore temporary service', 'Notify zone manager', 'Complete permanent repair'],
  'Upgrade / Improvement': ['Confirm scope with custodian', 'Procure materials', 'Execute installation', 'Commission and test', 'Handover and training'],
}

const WO_TYPE_OPTIONS: readonly WeightedOption<WorkOrderType>[] = [
  { v: 'Corrective', w: 34 },
  { v: 'Preventive', w: 26 },
  { v: 'Inspection', w: 12 },
  { v: 'Statutory Compliance', w: 9 },
  { v: 'Predictive', w: 7 },
  { v: 'Emergency', w: 6 },
  { v: 'Upgrade / Improvement', w: 6 },
]

const WO_SOURCE_OPTIONS: readonly WeightedOption<WorkOrderSource>[] = [
  { v: 'QR Scan', w: 24 },
  { v: 'Scheduled PM', w: 22 },
  { v: 'Tenant Portal', w: 16 },
  { v: 'Call Centre', w: 14 },
  { v: 'Inspection Finding', w: 10 },
  { v: 'IoT Sensor', w: 8 },
  { v: 'WhatsApp Bot', w: 6 },
]

const PRIORITY_BY_TYPE: Record<WorkOrderType, readonly WeightedOption<Priority>[]> = {
  Emergency: [{ v: 'P1 - Critical', w: 80 }, { v: 'P2 - High', w: 20 }],
  Corrective: [{ v: 'P1 - Critical', w: 10 }, { v: 'P2 - High', w: 38 }, { v: 'P3 - Medium', w: 42 }, { v: 'P4 - Low', w: 10 }],
  Preventive: [{ v: 'P2 - High', w: 14 }, { v: 'P3 - Medium', w: 56 }, { v: 'P4 - Low', w: 30 }],
  Predictive: [{ v: 'P2 - High', w: 30 }, { v: 'P3 - Medium', w: 55 }, { v: 'P4 - Low', w: 15 }],
  Inspection: [{ v: 'P3 - Medium', w: 60 }, { v: 'P4 - Low', w: 40 }],
  'Statutory Compliance': [{ v: 'P1 - Critical', w: 12 }, { v: 'P2 - High', w: 48 }, { v: 'P3 - Medium', w: 40 }],
  'Upgrade / Improvement': [{ v: 'P3 - Medium', w: 45 }, { v: 'P4 - Low', w: 55 }],
}

const SLA_HOURS: Record<Priority, number> = {
  'P1 - Critical': 4,
  'P2 - High': 24,
  'P3 - Medium': 72,
  'P4 - Low': 168,
}

/** 34 work orders: 18 still live (the Tasks badge), 14 closed, 2 cancelled. */
const WO_STATUS_PLAN: readonly (readonly [WorkOrderStatus, number])[] = [
  ['Open', 4],
  ['Assigned', 4],
  ['In Progress', 5],
  ['On Hold', 2],
  ['Pending Parts', 2],
  ['Pending Verification', 1],
  ['Closed', 14],
  ['Cancelled', 2],
]

export function computeSlaStatus(raisedAt: Date, slaDueAt: Date, completedAt?: Date): SlaStatus {
  if (completedAt) return completedAt.getTime() <= slaDueAt.getTime() ? 'Met' : 'Breached'
  const now = NOW.getTime()
  if (now > slaDueAt.getTime()) return 'Breached'
  const windowMs = Math.max(1, slaDueAt.getTime() - raisedAt.getTime())
  return slaDueAt.getTime() - now < windowMs * 0.25 ? 'At Risk' : 'On Track'
}

function technicianForZone(zone: Zone): Technician {
  const inZone = TECHNICIANS.filter((t) => t.zone === zone)
  return inZone.length > 0 ? pick(inZone) : pick(TECHNICIANS)
}

function buildWorkOrders(): WorkOrder[] {
  const statuses: WorkOrderStatus[] = []
  for (const [s, n] of WO_STATUS_PLAN) for (let i = 0; i < n; i++) statuses.push(s)
  const plan = shuffle(statuses)

  // Work orders land on things that can actually break.
  const candidates = ASSETS.filter((a) => a.category !== 'Land')
  const options: readonly WeightedOption<Asset>[] = candidates.map((a) => ({
    v: a,
    w:
      (a.criticality === 'Critical' ? 5 : a.criticality === 'High' ? 3.2 : a.criticality === 'Medium' ? 1.8 : 1) *
      (a.conditionScore < 60 ? 2.1 : a.conditionScore < 75 ? 1.4 : 1),
  }))

  const year = NOW.getFullYear()
  let closedSeen = 0

  return plan.map((status, i): WorkOrder => {
    const asset = weighted(options)
    const type = weighted(WO_TYPE_OPTIONS)
    const priority = weighted(PRIORITY_BY_TYPE[type])
    const slaHours = SLA_HOURS[priority]
    const source = weighted(WO_SOURCE_OPTIONS)

    const closed = status === 'Closed' || status === 'Cancelled'
    // Live jobs cluster inside their SLA window; the tail that pokes past it is
    // what the Tasks screen and the Copilot escalation alert are there to catch.
    const raisedHoursAgo = closed ? -ri(72, 1600) : -Math.max(1, Math.round(skew(0.5, slaHours * 2, 1.9)))
    const raisedAt = dateHoursFromNow(raisedHoursAgo)
    const slaDueAt = new Date(raisedAt.getTime() + slaHours * MS_HOUR)
    // Closed jobs mostly land inside the SLA window. Exactly one of the fourteen
    // is allowed to overrun, so the SLA Compliance KPI lands at a believable
    // 92.9% rather than a suspicious 100% — the tile is computed, not asserted.
    let completedAt: Date | undefined
    if (status === 'Closed') {
      const overran = closedSeen === 5
      closedSeen++
      completedAt = new Date(raisedAt.getTime() + slaHours * MS_HOUR * (overran ? rf(1.15, 1.8) : rf(0.28, 0.94)))
    }

    const assignee = status === 'Open' ? undefined : technicianForZone(asset.zone)
    const raisedBy = pick(STAFF_NAMES)
    const estimatedCost = roundTo(
      skew(320, type === 'Upgrade / Improvement' ? 92_000 : 26_000, 1.6) *
        (priority === 'P1 - Critical' ? 1.5 : 1),
      10,
    )

    const checklistLabels = CHECKLIST_BY_TYPE[type]
    const doneCount =
      status === 'Closed'
        ? checklistLabels.length
        : status === 'In Progress'
          ? ri(1, Math.max(1, checklistLabels.length - 1))
          : status === 'Pending Verification'
            ? checklistLabels.length - 1
            : status === 'Pending Parts' || status === 'On Hold'
              ? ri(1, 2)
              : 0

    const checklist: ChecklistItem[] = checklistLabels.map((label, idx) => ({
      id: `CHK-${pad(i + 1, 3)}-${idx + 1}`,
      label,
      done: idx < doneCount,
    }))

    const history: WorkOrderEvent[] = [
      { at: raisedAt.toISOString(), actor: raisedBy, action: 'Work order raised', note: `Logged via ${source}.` },
    ]
    if (assignee) {
      history.push({
        at: new Date(raisedAt.getTime() + MS_HOUR * rf(0.2, 3)).toISOString(),
        actor: 'Sistem Penjadualan KDH',
        action: `Assigned to ${assignee.name}`,
        note: `${assignee.team} — ${asset.zone}.`,
      })
    }
    if (status === 'In Progress' || status === 'Pending Parts' || status === 'Pending Verification' || status === 'Closed') {
      history.push({
        at: new Date(raisedAt.getTime() + MS_HOUR * rf(1, Math.max(2, slaHours * 0.5))).toISOString(),
        actor: assignee?.name ?? raisedBy,
        action: 'Attended site',
        note: 'Arrival confirmed by QR scan at the asset label.',
      })
    }
    if (status === 'Pending Parts') {
      history.push({
        at: new Date(raisedAt.getTime() + MS_HOUR * rf(2, Math.max(3, slaHours * 0.7))).toISOString(),
        actor: assignee?.name ?? raisedBy,
        action: 'Parts requisition raised',
        note: 'Awaiting delivery from the panel supplier.',
      })
    }
    if (status === 'On Hold') {
      history.push({
        at: new Date(raisedAt.getTime() + MS_HOUR * rf(2, Math.max(3, slaHours * 0.6))).toISOString(),
        actor: 'Pengurus Zon',
        action: 'Placed on hold',
        note: 'Access restricted until the tenant vacates the affected area.',
      })
    }
    if (completedAt) {
      history.push({
        at: completedAt.toISOString(),
        actor: assignee?.name ?? raisedBy,
        action: 'Work completed and verified',
        note: 'Checklist closed out; photographs attached to the asset record.',
      })
    }
    if (status === 'Cancelled') {
      history.push({
        at: new Date(raisedAt.getTime() + MS_HOUR * rf(4, 40)).toISOString(),
        actor: 'Pengurus Fasiliti',
        action: 'Cancelled',
        note: 'Duplicate of an existing work order on the same asset.',
      })
    }

    return {
      id: `WO-${pad(i + 1, 4)}`,
      code: `WO-${year}-${pad(148 + i * 3, 4)}`,
      assetId: asset.id,
      assetName: asset.name,
      assetCode: asset.code,
      zone: asset.zone,
      title: pick(WO_TITLES[type]),
      description: WO_DESCRIPTIONS[type],
      type,
      priority,
      status,
      source,
      raisedBy,
      raisedAt: raisedAt.toISOString(),
      assignedTo: assignee?.name ?? 'Unassigned',
      slaHours,
      slaDueAt: slaDueAt.toISOString(),
      completedAt: completedAt?.toISOString(),
      slaStatus: computeSlaStatus(raisedAt, slaDueAt, completedAt),
      estimatedCost,
      actualCost: status === 'Closed' ? roundTo(estimatedCost * rf(0.78, 1.32), 10) : undefined,
      checklist,
      history,
    }
  })
}

export const WORK_ORDERS: WorkOrder[] = buildWorkOrders()

// Referential integrity + derived counts.
;(function reconcile() {
  const live = new Set<WorkOrderStatus>(['Open', 'Assigned', 'In Progress', 'On Hold', 'Pending Parts', 'Pending Verification'])
  for (const t of TECHNICIANS) {
    t.openJobs = WORK_ORDERS.filter((w) => w.assignedTo === t.name && live.has(w.status)).length
  }
})()

/* =====================================================================================
 * 9. LEASES — 20 summaries
 * ===================================================================================== */

const UNIT_PREFIX_BY_SUB: Record<string, (n: number) => string> = {
  'Retail Complex': (n) => `G-${pad(n, 2)}`,
  'Office Tower': (n) => `${pad(3 + (n % 9), 2)}-${pad(n, 2)}`,
  'Public Market': (n) => `Gerai ${pad(n, 2)}`,
  'Food Court': (n) => `Gerai ${pad(n, 2)}`,
  'Shophouse Row': (n) => `Lot ${pad(n, 2)}`,
  'Business Arcade': (n) => `Kiosk K-${pad(n, 2)}`,
  'Commercial Centre': (n) => `PN-${pad(n, 2)}`,
  'Night Bazaar': (n) => `Kiosk B-${pad(n, 2)}`,
}

function unitNoFor(sub: string, n: number): string {
  const fn = UNIT_PREFIX_BY_SUB[sub]
  return fn ? fn(n) : `Unit ${pad(n, 2)}`
}

/** A satay stall does not rent an office suite — match the tenant to the space. */
function tenantKindFor(asset: Asset): TenantKind {
  if (asset.category === 'Industrial') return 'industrial'
  if (asset.category === 'Tourism & Hospitality') return 'tourism'
  if (asset.subCategory === 'Office Tower') return 'office'
  if (asset.subCategory === 'Public Market' || asset.subCategory === 'Food Court' || asset.subCategory === 'Night Bazaar') {
    return 'stall'
  }
  return 'retail'
}

function buildLeases(): LeaseSummary[] {
  const hosts = ASSETS.filter(
    (a) => a.category === 'Commercial Property' || a.category === 'Industrial' || a.category === 'Tourism & Hospitality',
  )
  const byKind = new Map<TenantKind, (readonly [string, string, TenantKind])[]>()
  for (const t of shuffle(TENANT_POOL)) {
    const list = byKind.get(t[2]) ?? []
    list.push(t)
    byKind.set(t[2], list)
  }
  const cursor = new Map<TenantKind, number>()
  const out: LeaseSummary[] = []

  for (let i = 0; i < 20; i++) {
    const host = hosts[i % hosts.length]
    const kind = tenantKindFor(host)
    const pool = byKind.get(kind) ?? shuffle(TENANT_POOL)
    const at = cursor.get(kind) ?? 0
    cursor.set(kind, at + 1)
    const tenant = pool[at % pool.length]
    const endDays = Math.round(skew(-90, 900, 1.15))
    const status: LeaseStatus =
      endDays < 0 ? (chance(0.55) ? 'Expired' : 'Renewal In Progress') : endDays < 90 ? 'Expiring Soon' : 'Active'
    const monthlyRent = roundTo(skew(750, 14_500, 1.5), 50)
    const arrearsMonths = chance(0.28) ? ri(1, 4) : 0

    out.push({
      id: `LSE-${pad(i + 1, 4)}`,
      unitNo: unitNoFor(host.subCategory, 1 + (i % 12)),
      propertyName: host.name,
      tenantName: tenant[0],
      monthlyRent,
      endDate: dayFromNow(endDays),
      status,
      outstandingAmount: arrearsMonths === 0 ? 0 : roundTo(monthlyRent * arrearsMonths * rf(0.6, 1.05), 10),
    })
  }
  return out
}

export const LEASES: LeaseSummary[] = buildLeases()

/* =====================================================================================
 * 10. MONTHLY TREND — 12 points
 * ===================================================================================== */

function buildMonthlyTrend(): MonthlyTrend[] {
  const out: MonthlyTrend[] = []
  let base = 4_180_000
  for (let i = 11; i >= 0; i--) {
    const d = monthStart(-i)
    base = base * rf(1.004, 1.021)
    const revenue = roundTo(base * rf(0.96, 1.05), 1_000)
    const target = roundTo(base * 1.03, 1_000)
    out.push({
      period: `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}`,
      label: MONTH_SHORT[d.getMonth()],
      revenue,
      target,
      collections: roundTo(revenue * rf(0.88, 0.985), 1_000),
      maintenanceSpend: roundTo(revenue * rf(0.09, 0.16), 1_000),
    })
  }
  return out
}

export const MONTHLY_TREND: MonthlyTrend[] = buildMonthlyTrend()

/* =====================================================================================
 * 11. KPIs — 6 tiles
 * ===================================================================================== */

function sparkAround(centre: number, spread: number, drift: number): number[] {
  const out: number[] = []
  let v = centre - drift
  for (let i = 0; i < 12; i++) {
    v += drift / 11 + rf(-spread, spread)
    out.push(Number(v.toFixed(2)))
  }
  return out
}

function buildKpis(): Kpi[] {
  const portfolioValue = ASSETS.reduce((s, a) => s + a.currentValue, 0)
  const live = new Set<WorkOrderStatus>(['Open', 'Assigned', 'In Progress', 'On Hold', 'Pending Parts', 'Pending Verification'])
  const openWo = WORK_ORDERS.filter((w) => live.has(w.status)).length
  const closed = WORK_ORDERS.filter((w) => w.status === 'Closed')
  const slaCompliance = closed.length === 0 ? 100 : (closed.filter((w) => w.slaStatus === 'Met').length / closed.length) * 100
  // Occupancy only means something for space that can actually be let.
  const lettable = ASSETS.filter(
    (a) => a.category === 'Commercial Property' || a.category === 'Industrial' || a.category === 'Tourism & Hospitality',
  )
  const occupancy = lettable.reduce((s, a) => s + a.utilisationRate, 0) / Math.max(1, lettable.length)

  // Collections against billings over the last quarter, from the same roll-up
  // the dashboard trend chart plots.
  const lastQuarter = MONTHLY_TREND.slice(-3)
  const billed = lastQuarter.reduce((s, m) => s + m.revenue, 0)
  const collected = lastQuarter.reduce((s, m) => s + m.collections, 0)
  const collectionRate = billed === 0 ? 100 : clamp((collected / billed) * 100, 70, 99.4)

  return [
    {
      id: 'kpi-portfolio-value',
      label: 'Portfolio Value',
      value: formatMYRCompact(portfolioValue),
      unit: '',
      raw: portfolioValue,
      delta: 3.8,
      intent: 'positive',
      spark: sparkAround(portfolioValue / 1_000_000, 6, 34),
    },
    {
      id: 'kpi-assets',
      label: 'Assets Under Management',
      value: String(ASSETS.length),
      unit: 'assets',
      raw: ASSETS.length,
      delta: 2.1,
      intent: 'positive',
      spark: sparkAround(ASSETS.length, 0.6, 3),
    },
    {
      id: 'kpi-open-wo',
      label: 'Open Work Orders',
      value: String(openWo),
      unit: 'jobs',
      raw: openWo,
      delta: -6.4,
      intent: 'positive',
      spark: sparkAround(openWo, 1.8, -4),
    },
    {
      id: 'kpi-sla',
      label: 'SLA Compliance',
      value: slaCompliance.toFixed(1),
      unit: '%',
      raw: slaCompliance,
      delta: 1.6,
      intent: slaCompliance >= 90 ? 'positive' : 'warning',
      spark: sparkAround(slaCompliance, 1.4, 3.1),
    },
    {
      id: 'kpi-occupancy',
      label: 'Occupancy',
      value: occupancy.toFixed(1),
      unit: '%',
      raw: occupancy,
      delta: -0.9,
      intent: 'warning',
      spark: sparkAround(occupancy, 0.9, -1.7),
    },
    {
      id: 'kpi-collection',
      label: 'Collection Rate',
      value: collectionRate.toFixed(1),
      unit: '%',
      raw: collectionRate,
      delta: 2.4,
      intent: 'positive',
      spark: sparkAround(collectionRate, 0.8, 2.2),
    },
  ]
}

export const KPIS: Kpi[] = buildKpis()

/* =====================================================================================
 * 12. COPILOT ALERTS — 12 hand-written insights
 * ===================================================================================== */

function buildAlerts(): CopilotAlert[] {
  const kompleks = named('Kompleks Niaga Bandar Penawar')
  const menara = named('Menara KEJORA Bandar Penawar')
  const pasar = named('Pasar Awam Sungai Rengit')
  const ladang = named('Ladang Kelapa Sawit Air Tawar Blok 7')
  const chalet = named('Desaru Coast Chalet Blok C')
  const jeti = named('Jeti Nelayan Sedili Besar')
  const dewan = named('Dewan Serbaguna Felda Adela')

  const breached = WORK_ORDERS.find((w) => w.slaStatus === 'Breached' && w.status !== 'Closed' && w.status !== 'Cancelled')
  const expiringInsurance = ASSETS.filter((a) => a.insuranceExpiry && a.insuranceExpiry < dayFromNow(45)).sort(
    (a, b) => (a.insuranceExpiry! < b.insuranceExpiry! ? -1 : 1),
  )[0]
  const lowData = [...ASSETS].sort((a, b) => a.dataQualityScore - b.dataQualityScore)[0]
  const idle = ASSETS.find((a) => a.status === 'Idle' || a.status === 'Vacant') ?? ASSETS[3]
  const arrears = [...LEASES].sort((a, b) => b.outstandingAmount - a.outstandingAmount)[0]
  const worstCondition = [...ASSETS].sort((a, b) => a.conditionScore - b.conditionScore)[0]

  const rows: CopilotAlert[] = [
    {
      id: 'ALT-0001',
      severity: 'critical',
      category: 'Maintenance Economics',
      title: 'Repeat chiller failure is now costing more than replacement',
      insight: `The aircond chiller at ${kompleks.name} has failed 3 times in 60 days. Cumulative repair spend is RM 11,900 against an annualised run-rate of RM 34,600, and each failure closes 4 lettable units for roughly half a day.`,
      recommendation: `Replace the chiller under the FY capital allocation rather than continuing to repair — replacement is RM 18,400 cheaper over 24 months and removes an estimated 62 hours of tenant downtime.`,
      confidence: 92,
      assetId: kompleks.id,
      assetName: kompleks.name,
      valueImpact: 18_400,
      sources: ['Work order history', 'Maintenance ledger', 'Tenant downtime log'],
      raisedAt: isoHoursFromNow(-6),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0002',
      severity: 'critical',
      category: 'Compliance Risk',
      title: 'Fire certificate lapses before the next inspection window',
      insight: `${menara.name} carries a BOMBA fire certificate expiring in 19 days, but the earliest available slot with the appointed competent person is 27 days out. Two tenancy agreements in the tower require a valid certificate as a condition of occupation.`,
      recommendation: 'Escalate to the compliance unit today and request a priority inspection slot. Prepare the alternative contractor on the panel as a fallback so the certificate does not lapse.',
      confidence: 88,
      assetId: menara.id,
      assetName: menara.name,
      valueImpact: 240_000,
      sources: ['Compliance register', 'Vendor calendar', 'Lease conditions'],
      raisedAt: isoHoursFromNow(-11),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0003',
      severity: 'warning',
      category: 'Revenue Leakage',
      title: 'Market stall rents sit 22% under the zone benchmark',
      insight: `Stall rents at ${pasar.name} average RM 4.10 psf against a Zon Pengerang–Sungai Rengit benchmark of RM 5.25 psf. Twelve tenancies have not been re-rated in three renewal cycles despite footfall growing 14% year on year.`,
      recommendation: 'Stage a 9% uplift across two renewal cycles, starting with the eight highest-turnover stalls, and pair it with a written service commitment to keep occupancy intact.',
      confidence: 79,
      assetId: pasar.id,
      assetName: pasar.name,
      valueImpact: 138_000,
      sources: ['Lease register', 'Zone rental benchmark', 'Footfall counters'],
      raisedAt: isoHoursFromNow(-20),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0004',
      severity: 'opportunity',
      category: 'Portfolio Strategy',
      title: 'Estate block is worth more as a development parcel',
      insight: `${ladang.name} yields RM 1,780 per hectare per month as plantation. The adjoining parcel transacted last quarter at a value implying a 3.4× uplift if converted to a mixed development title, and the access road upgrade is already funded.`,
      recommendation: 'Commission a conversion feasibility study before the next state land committee sitting. Even a partial 40-hectare conversion clears the study cost within one quarter.',
      confidence: 71,
      assetId: ladang.id,
      assetName: ladang.name,
      valueImpact: 4_200_000,
      sources: ['Valuation report', 'State transaction records', 'Infrastructure plan'],
      raisedAt: isoHoursFromNow(-31),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0005',
      severity: 'warning',
      category: 'Energy & ESG',
      title: 'Chalet block energy use is 31% above comparable blocks',
      insight: `${chalet.name} drew 31% more kWh per occupied room-night than the other Desaru blocks over the last three months, while occupancy was flat. The pattern matches split-unit compressors running past guest check-out.`,
      recommendation: 'Fit occupancy-linked cut-off relays on the 18 worst-performing rooms. Payback lands inside 11 months at the current tariff and trims an estimated 24 tonnes CO₂e a year.',
      confidence: 84,
      assetId: chalet.id,
      assetName: chalet.name,
      valueImpact: 76_500,
      sources: ['Utility meters', 'Booking system', 'Peer block benchmark'],
      raisedAt: isoHoursFromNow(-44),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0006',
      severity: 'critical',
      category: 'Compliance Risk',
      title: 'Jetty decking is deteriorating faster than the inspection cycle assumes',
      insight: `Condition scoring at ${jeti.name} has dropped 14 points in two inspections, twice the rate modelled for coastal timber structures. The jetty carries roughly 40 registered fishing vessels daily.`,
      recommendation: 'Shorten the inspection interval to quarterly and bring the deck replacement forward one financial year. Restrict heavy loading on the outer span until the survey is complete.',
      confidence: 90,
      assetId: jeti.id,
      assetName: jeti.name,
      valueImpact: 310_000,
      sources: ['Inspection history', 'Condition model', 'Harbour usage log'],
      raisedAt: isoHoursFromNow(-58),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0007',
      severity: 'opportunity',
      category: 'Utilisation',
      title: 'Community hall is bookable on 68% of idle evenings',
      insight: `${dewan.name} is used on 9 of 30 evenings a month. Comparable KDH halls within 25 km run at 21 bookings a month at RM 280 per session, and the hall already holds a valid public assembly permit.`,
      recommendation: 'List the hall on the KDH community booking channel and set a two-tier rate for residents and commercial hirers. No capital works required.',
      confidence: 74,
      assetId: dewan.id,
      assetName: dewan.name,
      valueImpact: 40_320,
      sources: ['Booking register', 'Peer facility utilisation', 'Permit register'],
      raisedAt: isoHoursFromNow(-70),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0008',
      severity: 'warning',
      category: 'Tenancy Risk',
      title: 'Largest arrears position has crossed the legal-action threshold',
      insight: `${arrears.tenantName} at ${arrears.propertyName} (${arrears.unitNo}) is carrying RM ${Math.round(arrears.outstandingAmount).toLocaleString('en-MY')} outstanding against a monthly rent of RM ${arrears.monthlyRent.toLocaleString('en-MY')}. Payment behaviour deteriorated over three consecutive cycles.`,
      recommendation: 'Issue the final notice now and offer a six-month structured settlement. Historical recovery on settlements at this stage is 78% versus 41% once the matter goes to legal action.',
      confidence: 81,
      valueImpact: Math.round(arrears.outstandingAmount * 0.78),
      sources: ['Arrears ageing', 'Payment history', 'Recovery outcomes'],
      raisedAt: isoHoursFromNow(-82),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0009',
      severity: 'warning',
      category: 'Maintenance Economics',
      title: 'An SLA breach is still open in the field',
      insight: breached
        ? `${breached.code} — "${breached.title}" at ${breached.assetName} passed its ${breached.slaHours}-hour SLA and remains ${breached.status.toLowerCase()}. Assigned to ${breached.assignedTo}.`
        : 'A priority work order is tracking close to its SLA window across the Desaru–Penawar zone.',
      recommendation: 'Reassign to the nearest available technician and notify the zone manager. Breaches of this class historically add 2.3 days to closure when left unescalated.',
      confidence: 86,
      assetId: breached?.assetId,
      assetName: breached?.assetName,
      workOrderId: breached?.id,
      valueImpact: 12_500,
      sources: ['Work order queue', 'Technician roster', 'SLA policy'],
      raisedAt: isoHoursFromNow(-3),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0010',
      severity: 'info',
      category: 'Data Quality',
      title: 'Weakest asset record is blocking an accurate valuation',
      insight: `${lowData.name} scores ${lowData.dataQualityScore}/100 on record completeness — the lowest in the portfolio. Missing fields feed straight into the group valuation and the insurance schedule.`,
      recommendation: 'Send a field verification task to the zone team. A single site visit with the app closes the title, area and photograph gaps in under 20 minutes.',
      confidence: 95,
      assetId: lowData.id,
      assetName: lowData.name,
      sources: ['Asset register', 'Data quality model'],
      raisedAt: isoHoursFromNow(-96),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0011',
      severity: 'info',
      category: 'Utilisation',
      title: 'Idle asset has had no recorded activity in 90 days',
      insight: `${idle.name} is marked ${idle.status} with ${idle.utilisationRate}% utilisation and no work order, inspection or booking activity in the last 90 days. It still draws an estimated RM 2,100 a month in holding cost.`,
      recommendation: 'Add it to the quarterly disposal-or-redeploy review. Two neighbouring zones have flagged demand that this asset could absorb without capital works.',
      confidence: 68,
      assetId: idle.id,
      assetName: idle.name,
      valueImpact: 25_200,
      sources: ['Activity log', 'Holding cost model', 'Zone demand register'],
      raisedAt: isoHoursFromNow(-120),
      acknowledged: false,
      dismissed: false,
    },
    {
      id: 'ALT-0012',
      severity: 'warning',
      category: 'Maintenance Economics',
      title: 'Condition score has crossed into the intervention band',
      insight: `${worstCondition.name} now scores ${worstCondition.conditionScore}/100 (${worstCondition.condition}). Assets that cross below 45 without intervention historically need 2.7× the repair spend within 18 months.`,
      recommendation: 'Schedule a full condition survey this quarter and pre-position a refurbishment budget line before the deterioration curve steepens.',
      confidence: 83,
      assetId: worstCondition.id,
      assetName: worstCondition.name,
      valueImpact: 195_000,
      sources: ['Condition survey history', 'Deterioration model', 'Capital plan'],
      raisedAt: isoHoursFromNow(-140),
      acknowledged: false,
      dismissed: false,
    },
  ]

  // Two alerts start acknowledged so the demo shows both states.
  rows[9] = { ...rows[9], acknowledged: true }
  rows[10] = { ...rows[10], acknowledged: true }
  return rows
}

export const ALERTS: CopilotAlert[] = buildAlerts()

/* =====================================================================================
 * 13. ACTIVITY — 14 feed rows
 * ===================================================================================== */

function buildActivity(): ActivityItem[] {
  const recentWo = WORK_ORDERS.filter((w) => w.status !== 'Cancelled').slice(0, 6)
  const rows: ActivityItem[] = []

  recentWo.forEach((w, i) => {
    rows.push({
      id: `ACT-${pad(rows.length + 1, 3)}`,
      at: isoHoursFromNow(-(2 + i * 5)),
      actor: w.assignedTo === 'Unassigned' ? w.raisedBy : w.assignedTo,
      action: w.status === 'Closed' ? 'Closed work order' : 'Updated work order',
      detail: `${w.code} — ${w.title} at ${w.assetName}`,
      kind: 'work-order',
      entityId: w.id,
    })
  })

  const scanned = ASSETS[2]
  rows.push({
    id: `ACT-${pad(rows.length + 1, 3)}`,
    at: isoHoursFromNow(-9),
    actor: TECHNICIANS[0].name,
    action: 'Scanned asset QR label',
    detail: `${scanned.code} verified on site at ${scanned.town}`,
    kind: 'asset',
    entityId: scanned.id,
  })

  const inspected = ASSETS[7]
  rows.push({
    id: `ACT-${pad(rows.length + 1, 3)}`,
    at: isoHoursFromNow(-14),
    actor: pick(STAFF_NAMES),
    action: 'Completed condition inspection',
    detail: `${inspected.name} — condition score updated to ${inspected.conditionScore}`,
    kind: 'inspection',
    entityId: inspected.id,
  })

  const paidLease = LEASES.find((l) => l.outstandingAmount === 0) ?? LEASES[0]
  rows.push({
    id: `ACT-${pad(rows.length + 1, 3)}`,
    at: isoHoursFromNow(-18),
    actor: 'Sistem Kutipan FPX',
    action: 'Rental payment received',
    detail: `${paidLease.tenantName} — ${paidLease.unitNo}, ${paidLease.propertyName}`,
    kind: 'payment',
    entityId: paidLease.id,
  })

  const renewing = LEASES.find((l) => l.status === 'Expiring Soon') ?? LEASES[1]
  rows.push({
    id: `ACT-${pad(rows.length + 1, 3)}`,
    at: isoHoursFromNow(-26),
    actor: pick(STAFF_NAMES),
    action: 'Lease renewal initiated',
    detail: `${renewing.unitNo}, ${renewing.propertyName} — ${renewing.tenantName}`,
    kind: 'lease',
    entityId: renewing.id,
  })

  rows.push({
    id: `ACT-${pad(rows.length + 1, 3)}`,
    at: isoHoursFromNow(-33),
    actor: 'One Asset Copilot',
    action: 'Raised a critical insight',
    detail: ALERTS[0].title,
    kind: 'alert',
    entityId: ALERTS[0].id,
  })

  const valued = ASSETS[11]
  rows.push({
    id: `ACT-${pad(rows.length + 1, 3)}`,
    at: isoHoursFromNow(-41),
    actor: pick(STAFF_NAMES),
    action: 'Revaluation filed',
    detail: `${valued.name} — carrying value refreshed in the fixed asset register`,
    kind: 'asset',
    entityId: valued.id,
  })

  rows.push({
    id: `ACT-${pad(rows.length + 1, 3)}`,
    at: isoHoursFromNow(-52),
    actor: 'Unit Pematuhan KDH',
    action: 'Statutory certificate filed',
    detail: `${ASSETS[4].name} — lightning protection test certificate received`,
    kind: 'inspection',
    entityId: ASSETS[4].id,
  })

  rows.push({
    id: `ACT-${pad(rows.length + 1, 3)}`,
    at: isoHoursFromNow(-64),
    actor: TECHNICIANS[3].name,
    action: 'Raised work order from the field',
    detail: `${WORK_ORDERS[8].code} — ${WORK_ORDERS[8].title}`,
    kind: 'work-order',
    entityId: WORK_ORDERS[8].id,
  })

  rows.push({
    id: `ACT-${pad(rows.length + 1, 3)}`,
    at: isoHoursFromNow(-79),
    actor: 'One Asset Copilot',
    action: 'Flagged a revenue opportunity',
    detail: ALERTS[3].title,
    kind: 'alert',
    entityId: ALERTS[3].id,
  })

  return rows.slice(0, 14)
}

export const ACTIVITY: ActivityItem[] = buildActivity()

/* =====================================================================================
 * 14. Convenience roll-ups
 * ===================================================================================== */

/** Asset counts and value per zone — the map legend and dashboard use this. */
export const ZONE_SUMMARY = (function buildZoneSummary() {
  const map = new Map<Zone, { zone: Zone; assets: number; value: number; openWorkOrders: number }>()
  for (const a of ASSETS) {
    const row = map.get(a.zone) ?? { zone: a.zone, assets: 0, value: 0, openWorkOrders: 0 }
    row.assets += 1
    row.value += a.currentValue
    map.set(a.zone, row)
  }
  for (const w of WORK_ORDERS) {
    if (w.status === 'Closed' || w.status === 'Cancelled') continue
    const row = map.get(w.zone)
    if (row) row.openWorkOrders += 1
  }
  return Array.from(map.values())
})()
