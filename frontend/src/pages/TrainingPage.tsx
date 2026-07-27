import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ListChecks, Play, Scale, Trash2 } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { Routine, SessionDetail, SessionSummary } from '../api/types'
import {
  Button,
  EmptyState,
  ErrorNote,
  PageHeader,
  Tag,
  cardCls,
  formatDate,
} from '../components/ui'

export function TrainingPage() {
  const navigate = useNavigate()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [active, setActive] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  async function load() {
    const [r, s, a] = await Promise.all([
      api.get<Routine[]>('/api/routines'),
      api.get<SessionSummary[]>('/api/sessions'),
      api.get<SessionDetail | null>('/api/sessions/active'),
    ])
    setRoutines(r)
    setSessions(s)
    setActive(a)
  }

  useEffect(() => {
    load()
      .catch(() => setError('Could not load training data.'))
      .finally(() => setLoading(false))
  }, [])

  async function start(routineId: number | null) {
    setError('')
    setStarting(true)
    try {
      const session = await api.post<SessionDetail>('/api/sessions', {
        from_routine_id: routineId,
      })
      navigate(`/training/session/${session.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the workout.')
      setStarting(false)
    }
  }

  async function remove(id: number) {
    setError('')
    try {
      await api.del(`/api/sessions/${id}`)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the session.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Training"
        description="Start a workout from a routine, log your sets, and watch the numbers go up."
        action={
          <div className="flex gap-2">
            <Link to="/training/routines">
              <Button variant="secondary">
                <span className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" /> Routines
                </span>
              </Button>
            </Link>
            <Link to="/bodyweight">
              <Button variant="secondary">
                <span className="flex items-center gap-2">
                  <Scale className="h-4 w-4" /> Bodyweight
                </span>
              </Button>
            </Link>
          </div>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {active && (
        <Link to={`/training/session/${active.id}`} className="mt-6 block">
          <div className={`${cardCls} border-l-4 border-primary p-6 transition-colors hover:bg-primary-tint/30`}>
            <Tag>In progress</Tag>
            <h2 className="mt-2 font-semibold">
              {active.routine_name ?? 'Free workout'} · {formatDate(active.date)}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {active.total_sets} sets logged — tap to continue.
            </p>
          </div>
        </Link>
      )}

      <section className="mt-8">
        <h2 className="font-semibold">Start a workout</h2>
        {loading ? (
          <div className="mt-3">
            <EmptyState>Loading…</EmptyState>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {routines.map((routine) => (
              <button
                key={routine.id}
                disabled={starting}
                onClick={() => start(routine.id)}
                className={`${cardCls} p-5 text-left transition-colors hover:bg-primary-tint/40 disabled:opacity-60`}
              >
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{routine.name}</span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  {routine.exercises.length} exercise
                  {routine.exercises.length === 1 ? '' : 's'}
                </p>
              </button>
            ))}
            <button
              disabled={starting}
              onClick={() => start(null)}
              className="rounded-2xl border border-dashed border-line p-5 text-left text-sm text-ink-soft transition-colors hover:bg-primary-tint/40 disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              <div className="mt-2 font-medium text-ink">Free workout</div>
              <p className="mt-1">Start empty and add exercises as you go.</p>
            </button>
          </div>
        )}
        {!loading && routines.length === 0 && (
          <p className="mt-3 text-sm text-ink-soft">
            Tip: create a <Link to="/training/routines" className="text-primary">routine</Link> so
            your exercises are filled in automatically.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">History</h2>
        <div className="mt-3 flex flex-col gap-3">
          {loading ? (
            <EmptyState>Loading…</EmptyState>
          ) : sessions.length === 0 ? (
            <EmptyState>No workouts logged yet.</EmptyState>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className={`${cardCls} flex items-center gap-4 p-4`}>
                <Link to={`/training/session/${s.id}`} className="min-w-0 flex-1">
                  <div className="text-xs text-ink-soft">{formatDate(s.date)}</div>
                  <div className="mt-0.5 truncate font-medium">
                    {s.routine_name ?? 'Free workout'}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {s.duration_minutes !== null && <Tag>{s.duration_minutes} min</Tag>}
                    <Tag>{s.total_sets} sets</Tag>
                    <Tag>{s.total_volume_kg.toLocaleString()} kg volume</Tag>
                    {!s.finished_at && <Tag>unfinished</Tag>}
                  </div>
                </Link>
                <button
                  onClick={() => remove(s.id)}
                  aria-label="Delete session"
                  className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-danger/5 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
