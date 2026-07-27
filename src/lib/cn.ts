/**
 * Tiny className utilities for the RN UI kit.
 *
 * `tailwind-merge` and `class-variance-authority` are not installed (and we are
 * not adding dependencies), so this module provides just enough of both:
 *
 *  - `cn()` joins class strings and resolves conflicts within a known group,
 *    last-one-wins. NativeWind resolves conflicting utilities by stylesheet
 *    order rather than string order, so a naive join would let a variant's
 *    `bg-primary` beat a caller's `bg-card`. Dropping the loser here fixes that.
 *  - `cv()` builds a shadcn-shaped variant function: base classes + a record of
 *    variant groups + defaults, returning `(props) => string`.
 */

export type ClassValue = string | false | null | undefined

const TEXT_SIZES = new Set([
  'text-xs',
  'text-sm',
  'text-base',
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
  'text-4xl',
  'text-5xl',
  'text-6xl',
  'text-7xl',
  'text-8xl',
  'text-9xl',
])

const TEXT_ALIGN = new Set(['text-left', 'text-center', 'text-right', 'text-justify'])

/** `text-[11px]` is a font size; `text-[#fff]` would be a colour. */
const ARBITRARY_TEXT = /^text-\[(.+)\]$/
const LENGTH_LIKE = /^-?[\d.]+(px|rem|em|pt)?$/

/** Widths and colours share the `border-` prefix but are different properties. */
const BORDER_WIDTHS = new Set(['border-0', 'border-2', 'border-4', 'border-8'])

/** Prefix → group. Longest prefix wins, so order matters within the array. */
const PREFIX_GROUPS: readonly (readonly [string, string])[] = [
  ['bg-', 'bg'],
  ['border-b-', 'border-b'],
  ['border-t-', 'border-t'],
  ['border-l-', 'border-l'],
  ['border-r-', 'border-r'],
  ['border-', 'border'],
  ['rounded-t', 'rounded-t'],
  ['rounded-b', 'rounded-b'],
  ['rounded-', 'rounded'],
  ['px-', 'px'],
  ['py-', 'py'],
  ['pt-', 'pt'],
  ['pb-', 'pb'],
  ['pl-', 'pl'],
  ['pr-', 'pr'],
  ['p-', 'p'],
  ['mx-', 'mx'],
  ['my-', 'my'],
  ['mt-', 'mt'],
  ['mb-', 'mb'],
  ['ml-', 'ml'],
  ['mr-', 'mr'],
  ['m-', 'm'],
  ['gap-x-', 'gap-x'],
  ['gap-y-', 'gap-y'],
  ['gap-', 'gap'],
  ['w-', 'w'],
  ['h-', 'h'],
  ['min-w-', 'min-w'],
  ['min-h-', 'min-h'],
  ['max-w-', 'max-w'],
  ['max-h-', 'max-h'],
  ['opacity-', 'opacity'],
  ['tracking-', 'tracking'],
  ['leading-', 'leading'],
  ['self-', 'self'],
  ['items-', 'items'],
  ['justify-', 'justify'],
  ['flex-', 'flex-dir'],
  ['font-', 'font'],
  ['text-', 'text-color'],
]

function groupOf(cls: string): string | undefined {
  if (TEXT_SIZES.has(cls)) return 'font-size'
  if (TEXT_ALIGN.has(cls)) return 'text-align'
  const arbitrary = ARBITRARY_TEXT.exec(cls)
  if (arbitrary) return LENGTH_LIKE.test(arbitrary[1]) ? 'font-size' : 'text-color'
  if (BORDER_WIDTHS.has(cls)) return 'border-w'
  // Variant-prefixed utilities (active:, dark:, ...) get their own namespace so
  // `active:bg-muted` never cancels `bg-card`.
  const colon = cls.lastIndexOf(':')
  if (colon !== -1) {
    const base = cls.slice(colon + 1)
    const g = groupOf(base)
    return g ? `${cls.slice(0, colon + 1)}${g}` : undefined
  }
  for (const [prefix, group] of PREFIX_GROUPS) {
    if (cls.startsWith(prefix)) return group
  }
  return undefined
}

/** Join class strings, dropping earlier entries that a later one overrides. */
export function cn(...values: ClassValue[]): string {
  const tokens: string[] = []
  for (const v of values) {
    if (!v) continue
    for (const t of v.split(/\s+/)) if (t) tokens.push(t)
  }
  const seen = new Map<string, number>()
  const out: (string | null)[] = []
  for (const t of tokens) {
    const g = groupOf(t)
    if (g) {
      const prev = seen.get(g)
      if (prev !== undefined) out[prev] = null
      seen.set(g, out.length)
    }
    out.push(t)
  }
  return out.filter((t): t is string => t !== null).join(' ')
}

/* ------------------------------------------------------------------ */
/* cv — the class-variance-authority stand-in                          */
/* ------------------------------------------------------------------ */

type VariantRecord = Record<string, Record<string, string>>

type VariantProps<V extends VariantRecord> = {
  [K in keyof V]?: keyof V[K]
}

export interface CvConfig<V extends VariantRecord> {
  variants: V
  defaultVariants?: VariantProps<V>
}

export type VariantFn<V extends VariantRecord> = (
  props?: VariantProps<V> & { className?: string },
) => string

/**
 * ```ts
 * const badge = cv('rounded-full px-2 py-0.5', {
 *   variants: { variant: { default: 'bg-primary', outline: 'border border-border' } },
 *   defaultVariants: { variant: 'default' },
 * })
 * badge({ variant: 'outline', className: 'mt-2' })
 * ```
 */
export function cv<V extends VariantRecord>(base: string, config: CvConfig<V>): VariantFn<V> {
  return (props) => {
    const parts: ClassValue[] = [base]
    for (const key of Object.keys(config.variants) as (keyof V)[]) {
      const chosen = props?.[key] ?? config.defaultVariants?.[key]
      if (chosen === undefined) continue
      parts.push(config.variants[key][chosen as string])
    }
    parts.push(props?.className)
    return cn(...parts)
  }
}

export type { VariantProps }
