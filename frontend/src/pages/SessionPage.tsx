import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronLeft, ExternalLink, Plus, Trash2, TrendingUp } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { ExerciseLog, Prefill, SessionDetail } from '../api/types'
import { ExercisePicker } from '../components/ExercisePicker'
import { Button, ErrorNote, Tag, cardCls, formatDate, inputCls } from '../components/ui'

/** One exercise inside the session: previous values, sets, notes and goal. */
function ExerciseLogCard({
  log,
  sessionId,
  onChanged,
  onError,
}: {
  log: ExerciseLog
  sessionId: number
  onChanged: () => Promise<void>
  onError: (message: string) => void
}) {
  const [prefill, setPrefill] = useState<Prefill | null>(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [goal, setGoal] = useState(log.goal)
  const [notes, setNotes] = useState(log.notes)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<Prefill>(`/api/exercises/${log.exercise_id}/prefill?session_id=${sessionId}`)
      .then((p) => {
        setPrefill(p)
        // Seed the goal from last time if nothing is set for today yet.
        setGoal((current) => current || p.goal)
      })
      .catch(() => {})
  }, [log.exercise_id, sessionId])

  // Prefill the next set's inputs from the matching set last time, else the last one.
  useEffect(() => {
    if (weight !== '' || reps !== '') return
    const nextNumber = log.sets.length + 1
    const source =
      prefill?.sets.find((s) => s.set_number === nextNumber) ??
      prefill?.sets[prefill.sets.length - 1]
    if (source) {
      setWeight(String(source.weight_kg))
      setReps(String(source.reps))
    }
    // Only seeds when the inputs are untouched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, log.sets.length])

  async function addSet() {
    if (weight === '' || reps === '') return
    setBusy(true)
    try {
      await api.post(`/api/logs/${log.id}/sets`, {
        weight_kg: Number(weight),
        reps: Number(reps),
      })
      setWeight('')
      setReps('')
      await onChanged()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not save the set.')
    } finally {
      setBusy(false)
    }
  }

  async function removeSet(setId: number) {
    try {
      await api.del(`/api/sets/${setId}`)
      await onChanged()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not delete the set.')
    }
  }

  async function saveNotes() {
    try {
      await api.put(`/api/logs/${log.id}`, { notes, goal })
      await onChanged()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not save notes.')
    }
  }

  async function removeExercise() {
    try {
      await api.del(`/api/logs/${log.id}`)
      await onChanged()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not remove the exercise.')
    }
  }

  const prevLabel = (setNumber: number) => {
    const s = prefill?.sets.find((p) => p.set_number === setNumber)
    return s ? `${s.weight_kg} × ${s.reps}` : '–'
  }

  return (
    <div className={`${cardCls} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{log.exercise.name}</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            {log.exercise.muscle_group || 'exercise'}
            {prefill?.last_session_date && ` · last: ${formatDate(prefill.last_session_date)}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to={`/training/exercise/${log.exercise_id}`}
            aria-label="History"
            className="rounded-lg p-2 text-ink-soft hover:bg-primary-tint hover:text-ink"
          >
            <TrendingUp className="h-4 w-4" />
          </Link>
          {log.exercise.guide_url && (
            <a
              href={log.exercise.guide_url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Guide"
              className="rounded-lg p-2 text-ink-soft hover:bg-primary-tint hover:text-ink"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={removeExercise}
            aria-label="Remove exercise"
            className="rounded-lg p-2 text-ink-soft hover:bg-danger/5 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <label className="mt-4 flex flex-col gap-1.5 text-xs font-medium text-ink-soft">
        Goal for today
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onBlur={saveNotes}
          placeholder="e.g. beat 65 kg × 8"
          className={inputCls}
        />
      </label>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="w-10 pb-2 font-medium">Set</th>
              <th className="pb-2 font-medium">Previous</th>
              <th className="pb-2 font-medium">kg</th>
              <th className="pb-2 font-medium">Reps</th>
              <th className="w-10 pb-2" />
            </tr>
          </thead>
          <tbody>
            {log.sets.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="py-2 text-ink-soft">{s.set_number}</td>
                <td className="py-2 text-ink-soft">{prevLabel(s.set_number)}</td>
                <td className="py-2 font-medium">{s.weight_kg}</td>
                <td className="py-2 font-medium">{s.reps}</td>
                <td className="py-2">
                  <button
                    onClick={() => removeSet(s.id)}
                    aria-label={`Delete set ${s.set_number}`}
                    className="rounded p-1 text-ink-soft hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="border-t border-line bg-primary-tint/30">
              <td className="py-2 text-ink-soft">{log.sets.length + 1}</td>
              <td className="py-2 text-ink-soft">{prevLabel(log.sets.length + 1)}</td>
              <td className="py-2 pr-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={`${inputCls} w-20`}
                  placeholder="kg"
                />
              </td>
              <td className="py-2 pr-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSet()}
                  className={`${inputCls} w-20`}
                  placeholder="reps"
                />
              </td>
              <td className="py-2">
                <button
                  onClick={addSet}
                  disabled={busy || weight === '' || reps === ''}
                  aria-label="Log set"
                  className="rounded-lg bg-primary p-2 text-white transition-colors hover:bg-primary-strong disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <label className="mt-4 flex flex-col gap-1.5 text-xs font-medium text-ink-soft">
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="e.g. felt heavy, increase next week"
          className={`${inputCls} min-h-16 resize-y`}
        />
      </label>
    </div>
  )
}

export function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [picking, setPicking] = useState(false)

  const load = useCallback(async () => {
    setSession(await api.get<SessionDetail>(`/api/sessions/${id}`))
  }, [id])

  useEffect(() => {
    load()
      .catch(() => setError('Could not load this session.'))
      .finally(() => setLoading(false))
  }, [load])

  async function addExercise(exerciseId: number) {
    setError('')
    try {
      await api.post(`/api/sessions/${id}/logs`, { exercise_id: exerciseId })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the exercise.')
    }
  }

  async function finish() {
    setError('')
    try {
      await api.put(`/api/sessions/${id}/finish`, {})
      navigate('/training')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not finish the workout.')
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>
  if (!session) return <ErrorNote>{error || 'Session not found.'}</ErrorNote>

  return (
    <div>
      <Link
        to="/training"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Training
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {session.routine_name ?? 'Free workout'}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Tag>{formatDate(session.date)}</Tag>
            <Tag>{session.total_sets} sets</Tag>
            <Tag>{session.total_volume_kg.toLocaleString()} kg volume</Tag>
            {session.duration_minutes !== null && <Tag>{session.duration_minutes} min</Tag>}
          </div>
        </div>
        {!session.finished_at && <Button onClick={finish}>Finish workout</Button>}
      </div>

      <ErrorNote>{error}</ErrorNote>

      <div className="mt-6 flex flex-col gap-4">
        {session.logs.map((log) => (
          <ExerciseLogCard
            key={log.id}
            log={log}
            sessionId={session.id}
            onChanged={load}
            onError={setError}
          />
        ))}
      </div>

      <Button variant="secondary" className="mt-4" onClick={() => setPicking(true)}>
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add exercise
        </span>
      </Button>

      {picking && (
        <ExercisePicker
          excludeIds={session.logs.map((l) => l.exercise_id)}
          onClose={() => setPicking(false)}
          onPick={(exercise) => {
            setPicking(false)
            addExercise(exercise.id)
          }}
        />
      )}
    </div>
  )
}
