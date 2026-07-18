import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { DietGoal } from '../api/types'
import { useAuth } from '../auth/AuthContext'

const inputCls =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10'

const dietGoals: { value: DietGoal; label: string }[] = [
  { value: 'lean_bulk', label: 'Lean bulk' },
  { value: 'bulk', label: 'Bulk' },
  { value: 'cut', label: 'Cut' },
  { value: 'custom', label: 'Custom' },
]

export function OnboardingPage() {
  const { user, profile, refresh } = useAuth()
  const navigate = useNavigate()

  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [gender, setGender] = useState('')
  const [trainingGoal, setTrainingGoal] = useState('')
  const [dietGoal, setDietGoal] = useState<DietGoal>('lean_bulk')
  const [dietCustomText, setDietCustomText] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (profile) return <Navigate to="/" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/api/profile', {
        height_cm: Number(heightCm),
        weight_kg: Number(weightKg),
        gender,
        training_goal: trainingGoal,
        diet_goal: dietGoal,
        diet_custom_text: dietCustomText,
      })
      await refresh()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user?.display_name ? `, ${user.display_name.split(' ')[0]}` : ''}.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          A few basics so training and diet can be tailored to you.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Height (cm)
              <input
                type="number"
                required
                min={100}
                max={250}
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className={inputCls}
                placeholder="180"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Weight (kg)
              <input
                type="number"
                required
                min={30}
                max={300}
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className={inputCls}
                placeholder="75"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Gender
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Training goal
            <input
              type="text"
              value={trainingGoal}
              onChange={(e) => setTrainingGoal(e.target.value)}
              className={inputCls}
              placeholder="e.g. Build muscle, train 3× per week"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Diet goal
            <select
              value={dietGoal}
              onChange={(e) => setDietGoal(e.target.value as DietGoal)}
              className={inputCls}
            >
              {dietGoals.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>

          {dietGoal === 'custom' && (
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Describe your diet goal
              <textarea
                required
                value={dietCustomText}
                onChange={(e) => setDietCustomText(e.target.value)}
                className={`${inputCls} min-h-20 resize-y`}
                placeholder="e.g. Maintain weight but eat more protein"
              />
            </label>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-strong disabled:opacity-60"
          >
            {submitting ? 'Saving…' : "Let's go"}
          </button>
        </form>
      </div>
    </div>
  )
}
