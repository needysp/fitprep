import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { api } from '../api/client'
import type { ExerciseHistory } from '../api/types'
import { EmptyState, ErrorNote, Tag, cardCls, formatDate } from '../components/ui'

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={`${cardCls} p-5`}>
      <div className="text-xs uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-primary-strong">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-soft">{sub}</div>}
    </div>
  )
}

export function ExerciseHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const [history, setHistory] = useState<ExerciseHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<ExerciseHistory>(`/api/exercises/${id}/history`)
      .then(setHistory)
      .catch(() => setError('Could not load the history.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>
  if (!history) return <ErrorNote>{error || 'Not found.'}</ErrorNote>

  const maxVolume = Math.max(1, ...history.points.map((p) => p.total_volume_kg))

  return (
    <div>
      <Link
        to="/training"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Training
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {history.exercise.name}
        </h1>
        {history.exercise.guide_url && (
          <a
            href={history.exercise.guide_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-sm text-primary"
          >
            <ExternalLink className="h-4 w-4" /> Guide
          </a>
        )}
      </div>

      {history.points.length === 0 ? (
        <div className="mt-6">
          <EmptyState>No sets logged for this exercise yet.</EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat
              label="Best set"
              value={`${history.best_weight?.weight_kg} kg × ${history.best_weight?.reps}`}
              sub={history.best_weight ? formatDate(history.best_weight.date) : undefined}
            />
            <Stat
              label="Best est. 1RM"
              value={`${history.best_estimated_1rm?.estimated_1rm} kg`}
              sub={
                history.best_estimated_1rm
                  ? `${history.best_estimated_1rm.weight_kg} kg × ${history.best_estimated_1rm.reps}`
                  : undefined
              }
            />
            <Stat label="Sessions" value={String(history.points.length)} />
          </div>

          <h2 className="mt-8 font-semibold">Progress</h2>
          <div className="mt-3 flex flex-col gap-3">
            {[...history.points].reverse().map((p) => (
              <div key={`${p.session_id}-${p.date}`} className={`${cardCls} p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/training/session/${p.session_id}`} className="font-medium">
                    {formatDate(p.date)}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    <Tag>
                      top {p.best_weight_kg} kg × {p.best_reps}
                    </Tag>
                    <Tag>{p.total_volume_kg.toLocaleString()} kg</Tag>
                  </div>
                </div>
                {/* Simple volume bar — relative to the best session. */}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-parchment">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(p.total_volume_kg / maxVolume) * 100}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-ink-soft">
                  {p.sets.map((s) => `${s.weight_kg}×${s.reps}`).join('  ·  ')}
                </div>
                {p.notes && <p className="mt-2 text-sm text-ink-soft">“{p.notes}”</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
