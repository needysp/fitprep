import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { BodyweightEntry } from '../api/types'
import {
  Button,
  EmptyState,
  ErrorNote,
  PageHeader,
  cardCls,
  formatDate,
  inputCls,
} from '../components/ui'

/** Inline SVG line chart — no chart library needed for one series. */
function WeightChart({ entries }: { entries: BodyweightEntry[] }) {
  if (entries.length < 2) return null
  const width = 640
  const height = 160
  const pad = 8
  const weights = entries.map((e) => e.weight_kg)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const span = max - min || 1
  const points = entries.map((e, i) => {
    const x = pad + (i / (entries.length - 1)) * (width - pad * 2)
    const y = height - pad - ((e.weight_kg - min) / span) * (height - pad * 2)
    return `${x},${y}`
  })

  return (
    <div className={`${cardCls} p-5`}>
      <div className="flex items-baseline justify-between text-xs text-ink-soft">
        <span>{min.toFixed(1)} kg</span>
        <span>{max.toFixed(1)} kg</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 h-40 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Bodyweight over time"
      >
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#d97757"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-ink-soft">
        <span>{formatDate(entries[0].date)}</span>
        <span>{formatDate(entries[entries.length - 1].date)}</span>
      </div>
    </div>
  )
}

export function BodyweightPage() {
  const [entries, setEntries] = useState<BodyweightEntry[]>([])
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setEntries(await api.get<BodyweightEntry[]>('/api/bodyweight'))
  }

  useEffect(() => {
    load()
      .catch(() => setError('Could not load your bodyweight log.'))
      .finally(() => setLoading(false))
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/bodyweight', {
        weight_kg: Number(weight),
        date: date || null,
      })
      setWeight('')
      setDate('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the entry.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    try {
      await api.del(`/api/bodyweight/${id}`)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the entry.')
    }
  }

  const latest = entries.at(-1)
  const first = entries[0]
  const change = latest && first ? latest.weight_kg - first.weight_kg : 0

  return (
    <div>
      <PageHeader
        title="Bodyweight"
        description="Track your weight over time against your diet goal."
      />

      <ErrorNote>{error}</ErrorNote>

      <form onSubmit={submit} className={`${cardCls} mt-6 flex flex-wrap items-end gap-4 p-6`}>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Weight (kg)
          <input
            type="number"
            required
            step="0.1"
            min={20}
            max={500}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="80.5"
            className={`${inputCls} w-32`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputCls} w-44`}
          />
        </label>
        <Button type="submit" disabled={saving || !weight}>
          {saving ? 'Saving…' : 'Log weight'}
        </Button>
        <p className="text-xs text-ink-soft">Logging twice on one day updates that day.</p>
      </form>

      {latest && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className={`${cardCls} p-5`}>
            <div className="text-xs uppercase tracking-wide text-ink-soft">Current</div>
            <div className="mt-1 text-2xl font-semibold text-primary-strong">
              {latest.weight_kg} kg
            </div>
          </div>
          <div className={`${cardCls} p-5`}>
            <div className="text-xs uppercase tracking-wide text-ink-soft">Since start</div>
            <div className="mt-1 text-2xl font-semibold text-primary-strong">
              {change > 0 ? '+' : ''}
              {change.toFixed(1)} kg
            </div>
          </div>
          <div className={`${cardCls} p-5`}>
            <div className="text-xs uppercase tracking-wide text-ink-soft">Entries</div>
            <div className="mt-1 text-2xl font-semibold text-primary-strong">{entries.length}</div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <WeightChart entries={entries} />
      </div>

      <h2 className="mt-8 font-semibold">Log</h2>
      <div className={`${cardCls} mt-3 overflow-hidden`}>
        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-ink-soft">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState>No entries yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {[...entries].reverse().map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-6 py-3">
                <span className="flex-1 text-sm">{formatDate(e.date)}</span>
                <span className="font-medium">{e.weight_kg} kg</span>
                <button
                  onClick={() => remove(e.id)}
                  aria-label="Delete entry"
                  className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-danger/5 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
