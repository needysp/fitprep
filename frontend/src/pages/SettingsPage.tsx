import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { DietGoal, Profile } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Button, ErrorNote, PageHeader, Tag, cardCls, inputCls } from '../components/ui'

const dietGoals: { value: DietGoal; label: string }[] = [
  { value: 'lean_bulk', label: 'Lean bulk' },
  { value: 'bulk', label: 'Bulk' },
  { value: 'cut', label: 'Cut' },
  { value: 'custom', label: 'Custom' },
]

export function SettingsPage() {
  const { user, profile, refresh, logout } = useAuth()

  const [heightCm, setHeightCm] = useState('')
  const [gender, setGender] = useState('')
  const [trainingGoal, setTrainingGoal] = useState('')
  const [dietGoal, setDietGoal] = useState<DietGoal>('lean_bulk')
  const [dietCustomText, setDietCustomText] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setHeightCm(String(profile.height_cm))
    setGender(profile.gender)
    setTrainingGoal(profile.training_goal)
    setDietGoal(profile.diet_goal)
    setDietCustomText(profile.diet_custom_text)
  }, [profile])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      await api.put<Profile>('/api/profile', {
        height_cm: Number(heightCm),
        gender,
        training_goal: trainingGoal,
        diet_goal: dietGoal,
        diet_custom_text: dietCustomText,
      })
      await refresh()
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Your profile and goals." />

      <div className={`${cardCls} mt-6 p-6`}>
        <h2 className="font-semibold">Account</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-ink-soft">{user?.email}</span>
          <Tag>{user?.role === 'admin' ? 'Admin' : 'User'}</Tag>
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Signed in with Google. Weight is tracked on the{' '}
          <Link to="/bodyweight" className="text-primary">
            bodyweight page
          </Link>
          .
        </p>
      </div>

      <form onSubmit={save} className={`${cardCls} mt-4 p-6`}>
        <h2 className="font-semibold">Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Gender
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={inputCls}
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            Training goal
            <input
              value={trainingGoal}
              onChange={(e) => setTrainingGoal(e.target.value)}
              placeholder="e.g. Build muscle, train 3× per week"
              className={inputCls}
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
            <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
              Describe your diet goal
              <textarea
                required
                value={dietCustomText}
                onChange={(e) => setDietCustomText(e.target.value)}
                className={`${inputCls} min-h-20 resize-y`}
              />
            </label>
          )}
        </div>

        <ErrorNote>{error}</ErrorNote>

        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {saved && <span className="text-sm text-ink-soft">Saved.</span>}
        </div>
      </form>

      <div className="mt-4">
        <Button variant="ghost" onClick={() => void logout()}>
          <span className="flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Sign out
          </span>
        </Button>
      </div>
    </div>
  )
}
