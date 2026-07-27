import { useEffect, useMemo, useState } from 'react'
import { Info, Plus, Search, X } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { Exercise, ExerciseInput } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ExerciseFields, ExerciseInfoModal, emptyExerciseInput } from './ExerciseInfoModal'
import { Button, ErrorNote, Tag } from './ui'

/** Modal to pick an exercise, with inline creation when it isn't in the list. */
export function ExercisePicker({
  onPick,
  onClose,
  excludeIds = [],
}: {
  onPick: (exercise: Exercise) => void
  onClose: () => void
  excludeIds?: number[]
}) {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<ExerciseInput>(emptyExerciseInput)
  const [newGlobal, setNewGlobal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [infoFor, setInfoFor] = useState<Exercise | null>(null)

  useEffect(() => {
    api
      .get<Exercise[]>('/api/exercises')
      .then(setExercises)
      .catch(() => setError('Could not load exercises.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return exercises
      .filter((e) => !excludeIds.includes(e.id))
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.muscle_group.includes(q))
  }, [exercises, search, excludeIds])

  const exactMatch = exercises.some(
    (e) => e.name.toLowerCase() === search.trim().toLowerCase(),
  )

  async function handleCreate() {
    setError('')
    setSaving(true)
    try {
      const created = await api.post<Exercise>('/api/exercises', {
        ...draft,
        name: search.trim(),
        is_global: newGlobal,
      })
      onPick(created)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the exercise.')
      setSaving(false)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Exercise[]>()
    for (const e of filtered) {
      const key = e.muscle_group || 'other'
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/20 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line p-4">
          <Search className="h-4 w-4 shrink-0 text-ink-soft" />
          <input
            autoFocus
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCreating(false)
            }}
            placeholder="Search or type a new exercise…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button onClick={onClose} aria-label="Close" className="p-1 text-ink-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {error && <div className="px-2"><ErrorNote>{error}</ErrorNote></div>}

          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">Loading…</p>
          ) : (
            <>
              {grouped.map(([muscle, items]) => (
                <div key={muscle} className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {muscle}
                  </div>
                  {items.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-primary-tint"
                    >
                      <button
                        onClick={() => onPick(e)}
                        className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm"
                      >
                        <span className="flex-1">{e.name}</span>
                        {!e.is_global && <Tag>Mine</Tag>}
                      </button>
                      <button
                        onClick={() => setInfoFor(e)}
                        aria-label={`Info about ${e.name}`}
                        className="rounded-lg p-2 text-ink-soft hover:text-primary-strong"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              {filtered.length === 0 && !search.trim() && (
                <p className="px-4 py-8 text-center text-sm text-ink-soft">
                  No exercises available.
                </p>
              )}

              {/* Not in the catalog? Create it without leaving the flow. */}
              {search.trim() && !exactMatch && (
                <div className="border-t border-line p-3">
                  {!creating ? (
                    <button
                      onClick={() => setCreating(true)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-primary-tint"
                    >
                      <Plus className="h-4 w-4" />
                      Create “{search.trim()}”
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3 p-1">
                      <p className="text-sm font-medium">Create “{search.trim()}”</p>
                      <p className="text-xs text-ink-soft">
                        Everything below is optional — you can add the how-to later from the
                        info overlay.
                      </p>
                      <ExerciseFields value={draft} onChange={setDraft} showName={false} />
                      {user?.role === 'admin' && (
                        <label className="flex items-center gap-2 text-sm text-ink-soft">
                          <input
                            type="checkbox"
                            checked={newGlobal}
                            onChange={(e) => setNewGlobal(e.target.checked)}
                            className="accent-[#d97757]"
                          />
                          Add to the shared catalog (visible to everyone)
                        </label>
                      )}
                      <Button onClick={handleCreate} disabled={saving}>
                        {saving ? 'Creating…' : 'Create & add'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {infoFor && (
        <ExerciseInfoModal
          exercise={infoFor}
          onClose={() => setInfoFor(null)}
          onSaved={(updated) =>
            setExercises((list) => list.map((e) => (e.id === updated.id ? updated : e)))
          }
        />
      )}
    </div>
  )
}
