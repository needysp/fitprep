import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { Exercise, Routine } from '../api/types'
import { ExercisePicker } from '../components/ExercisePicker'
import { Button, EmptyState, ErrorNote, PageHeader, Tag, cardCls, inputCls } from '../components/ui'

interface DraftExercise {
  exercise: Exercise
  target_sets: number | null
  target_reps: string | null
}

function RoutineEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial: Routine | null
  onSaved: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [items, setItems] = useState<DraftExercise[]>(
    initial?.exercises.map((e) => ({
      exercise: e.exercise,
      target_sets: e.target_sets,
      target_reps: e.target_reps,
    })) ?? [],
  )
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function move(index: number, delta: number) {
    const next = [...items]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
  }

  function patch(index: number, changes: Partial<DraftExercise>) {
    setItems(items.map((it, i) => (i === index ? { ...it, ...changes } : it)))
  }

  async function save() {
    setError('')
    setSaving(true)
    const body = {
      name,
      description,
      exercises: items.map((it) => ({
        exercise_id: it.exercise.id,
        target_sets: it.target_sets,
        target_reps: it.target_reps || null,
      })),
    }
    try {
      if (initial) await api.put(`/api/routines/${initial.id}`, body)
      else await api.post('/api/routines', body)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the routine.')
      setSaving(false)
    }
  }

  return (
    <div className={`${cardCls} p-6`}>
      <h2 className="font-semibold">{initial ? 'Edit routine' : 'New routine'}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push Day"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="optional"
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium">Exercises</div>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            No exercises yet — add the ones you plan to train on this day.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {items.map((it, i) => (
              <li
                key={`${it.exercise.id}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-3"
              >
                <span className="w-6 shrink-0 text-xs text-ink-soft">{i + 1}.</span>
                <span className="flex-1 text-sm font-medium">{it.exercise.name}</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={it.target_sets ?? ''}
                  onChange={(e) =>
                    patch(i, { target_sets: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="sets"
                  className={`${inputCls} w-20`}
                />
                <input
                  value={it.target_reps ?? ''}
                  onChange={(e) => patch(i, { target_reps: e.target.value })}
                  placeholder="reps"
                  className={`${inputCls} w-24`}
                />
                <div className="flex">
                  <button
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                    className="rounded-lg p-2 text-ink-soft hover:bg-primary-tint"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                    className="rounded-lg p-2 text-ink-soft hover:bg-primary-tint"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                    aria-label="Remove"
                    className="rounded-lg p-2 text-ink-soft hover:bg-danger/5 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button variant="secondary" className="mt-3" onClick={() => setPicking(true)}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add exercise
          </span>
        </Button>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <div className="mt-6 flex gap-2">
        <Button onClick={save} disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : 'Save routine'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {picking && (
        <ExercisePicker
          excludeIds={items.map((it) => it.exercise.id)}
          onClose={() => setPicking(false)}
          onPick={(exercise) => {
            setItems([...items, { exercise, target_sets: null, target_reps: null }])
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

export function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Routine | null | undefined>(undefined)
  const [error, setError] = useState('')

  async function load() {
    setRoutines(await api.get<Routine[]>('/api/routines'))
  }

  useEffect(() => {
    load()
      .catch(() => setError('Could not load routines.'))
      .finally(() => setLoading(false))
  }, [])

  async function remove(id: number) {
    setError('')
    try {
      await api.del(`/api/routines/${id}`)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the routine.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Routines"
        description="Reusable training plans. Start a workout from one and its exercises are filled in for you."
        action={
          editing === undefined ? (
            <Button onClick={() => setEditing(null)}>
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> New routine
              </span>
            </Button>
          ) : undefined
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {editing !== undefined && (
        <div className="mt-6">
          <RoutineEditor
            initial={editing}
            onCancel={() => setEditing(undefined)}
            onSaved={() => {
              setEditing(undefined)
              load().catch(() => setError('Could not reload routines.'))
            }}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4">
        {loading ? (
          <EmptyState>Loading…</EmptyState>
        ) : routines.length === 0 ? (
          <EmptyState>No routines yet. Create one to plan your training days.</EmptyState>
        ) : (
          routines.map((routine) => (
            <div key={routine.id} className={`${cardCls} p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{routine.name}</h2>
                  {routine.description && (
                    <p className="mt-1 text-sm text-ink-soft">{routine.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="secondary" onClick={() => setEditing(routine)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => remove(routine.id)}>
                    Delete
                  </Button>
                </div>
              </div>
              <ul className="mt-4 flex flex-col divide-y divide-line">
                {routine.exercises.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="flex-1">{e.exercise.name}</span>
                    {(e.target_sets || e.target_reps) && (
                      <Tag>
                        {e.target_sets ?? '–'} × {e.target_reps ?? '–'}
                      </Tag>
                    )}
                    {e.exercise.guide_url && (
                      <a
                        href={e.exercise.guide_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary"
                        aria-label={`Guide for ${e.exercise.name}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
