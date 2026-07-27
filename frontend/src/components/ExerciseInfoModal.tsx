import { useState } from 'react'
import { ExternalLink, Pencil, X } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { Exercise, ExerciseInput } from '../api/types'
import { MUSCLE_GROUPS } from '../constants'
import { Button, ErrorNote, inputCls } from './ui'

export const emptyExerciseInput: ExerciseInput = {
  name: '',
  muscle_group: '',
  guide_url: '',
  target_muscles: '',
  target_muscles_image_url: '',
  execution: '',
  execution_image_url: '',
}

export function toInput(exercise: Exercise): ExerciseInput {
  return {
    name: exercise.name,
    muscle_group: exercise.muscle_group,
    guide_url: exercise.guide_url,
    target_muscles: exercise.target_muscles,
    target_muscles_image_url: exercise.target_muscles_image_url,
    execution: exercise.execution,
    execution_image_url: exercise.execution_image_url,
  }
}

/** Image that simply disappears if the URL is broken or hotlink-blocked. */
function InfoImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="mt-3 max-h-64 w-full rounded-lg object-contain"
    />
  )
}

/** The editable half — also reused by the picker's inline create form. */
export function ExerciseFields({
  value,
  onChange,
  showName = true,
}: {
  value: ExerciseInput
  onChange: (next: ExerciseInput) => void
  showName?: boolean
}) {
  const set = (patch: Partial<ExerciseInput>) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-4">
      {showName && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Name
          <input
            value={value.name}
            onChange={(e) => set({ name: e.target.value })}
            className={inputCls}
          />
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Muscle group
          <select
            value={value.muscle_group}
            onChange={(e) => set({ muscle_group: e.target.value })}
            className={inputCls}
          >
            <option value="">Uncategorized</option>
            {MUSCLE_GROUPS.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
            {/* Keep any pre-existing free-text value selectable so editing an
                older exercise can't silently recategorize it. */}
            {value.muscle_group &&
              !MUSCLE_GROUPS.some((g) => g.value === value.muscle_group) && (
                <option value={value.muscle_group}>{value.muscle_group}</option>
              )}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Guide link
          <input
            value={value.guide_url}
            onChange={(e) => set({ guide_url: e.target.value })}
            placeholder="https://www.fitundattraktiv.de/…"
            className={inputCls}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Target muscles
        <textarea
          value={value.target_muscles}
          onChange={(e) => set({ target_muscles: e.target.value })}
          placeholder="Which muscles this works — paste or write your own notes."
          className={`${inputCls} min-h-20 resize-y`}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Target muscles image (URL)
        <input
          value={value.target_muscles_image_url}
          onChange={(e) => set({ target_muscles_image_url: e.target.value })}
          placeholder="optional"
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Haltung &amp; Ausführung
        <textarea
          value={value.execution}
          onChange={(e) => set({ execution: e.target.value })}
          placeholder="Setup, posture and how to perform the movement."
          className={`${inputCls} min-h-32 resize-y`}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Execution image (URL)
        <input
          value={value.execution_image_url}
          onChange={(e) => set({ execution_image_url: e.target.value })}
          placeholder="optional"
          className={inputCls}
        />
      </label>
    </div>
  )
}

/** Overlay with an exercise's how-to info; switches to an edit form when allowed. */
export function ExerciseInfoModal({
  exercise,
  onClose,
  onSaved,
  startInEdit = false,
}: {
  exercise: Exercise
  onClose: () => void
  onSaved?: (updated: Exercise) => void
  startInEdit?: boolean
}) {
  const [editing, setEditing] = useState(startInEdit)
  const [draft, setDraft] = useState<ExerciseInput>(toInput(exercise))
  const [current, setCurrent] = useState(exercise)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const hasInfo =
    current.target_muscles ||
    current.execution ||
    current.target_muscles_image_url ||
    current.execution_image_url

  async function save() {
    setError('')
    setSaving(true)
    try {
      const updated = await api.put<Exercise>(`/api/exercises/${current.id}`, draft)
      setCurrent(updated)
      setEditing(false)
      onSaved?.(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the exercise.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/20 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line p-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold">{current.name}</h2>
            {current.muscle_group && (
              <p className="text-xs text-ink-soft">{current.muscle_group}</p>
            )}
          </div>
          {!editing && current.can_edit && (
            <button
              onClick={() => {
                setDraft(toInput(current))
                setEditing(true)
              }}
              aria-label="Edit exercise info"
              className="rounded-lg p-2 text-ink-soft hover:bg-primary-tint hover:text-ink"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-ink-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {editing ? (
            <>
              <ExerciseFields value={draft} onChange={setDraft} />
              <ErrorNote>{error}</ErrorNote>
              <div className="mt-5 flex gap-2">
                <Button onClick={save} disabled={saving || !draft.name.trim()}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {current.guide_url && (
                <a
                  href={current.guide_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                >
                  <ExternalLink className="h-4 w-4" /> Open guide
                </a>
              )}

              {!hasInfo && (
                <p className="py-6 text-center text-sm text-ink-soft">
                  No info saved for this exercise yet.
                  {current.can_edit
                    ? ' Tap the pencil to add target muscles and how to perform it.'
                    : ''}
                </p>
              )}

              {(current.target_muscles || current.target_muscles_image_url) && (
                <section className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Target muscles
                  </h3>
                  {current.target_muscles && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                      {current.target_muscles}
                    </p>
                  )}
                  <InfoImage
                    src={current.target_muscles_image_url}
                    alt={`Target muscles for ${current.name}`}
                  />
                </section>
              )}

              {(current.execution || current.execution_image_url) && (
                <section className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Haltung &amp; Ausführung
                  </h3>
                  {current.execution && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                      {current.execution}
                    </p>
                  )}
                  <InfoImage
                    src={current.execution_image_url}
                    alt={`Execution of ${current.name}`}
                  />
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
