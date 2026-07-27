import { Minus, Plus } from 'lucide-react'

/**
 * Compact number field flanked by step buttons — sized for tapping mid-set.
 * Layout is [−] [value] [+].
 */
export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  label,
  onEnter,
}: {
  value: string
  onChange: (next: string) => void
  step?: number
  min?: number
  max?: number
  label: string
  onEnter?: () => void
}) {
  function bump(delta: number) {
    const current = value === '' ? 0 : Number(value)
    const next = Math.min(max, Math.max(min, Math.round((current + delta) * 100) / 100))
    onChange(String(next))
  }

  const btn =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink-soft transition-colors hover:bg-primary-tint hover:text-primary-strong active:bg-primary-tint'

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => bump(-step)} aria-label={`Decrease ${label}`} className={btn}>
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        aria-label={label}
        className="h-9 w-14 rounded-lg border border-line bg-white px-1 text-center text-sm font-medium tabular-nums focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" onClick={() => bump(step)} aria-label={`Increase ${label}`} className={btn}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
