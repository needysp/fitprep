import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Play, Scale, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { api } from '../api/client'
import type { Dashboard } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Sparkline } from '../components/Sparkline'
import { MEAL_TYPES, WEEKDAYS } from '../constants'
import {
  Button,
  ErrorNote,
  Tag,
  cardCls,
  formatDate,
} from '../components/ui'

/**
 * Two bars per weekday — volume and duration. Workout counts are 0 or 1 in
 * practice and would render as identical on/off blocks, whereas these two vary
 * and answer different questions ("how heavy" vs "how long"). Each series is
 * scaled against its own weekly best, so heights are only comparable within a
 * series. Empty tracks stay visible so a rest day reads as "nothing here"
 * rather than as a missing bar.
 */
function WeeklyActivity({ perDay }: { perDay: Dashboard['week']['per_day'] }) {
  const maxVolume = Math.max(...perDay.map((d) => d.volume_kg), 0)
  const maxMinutes = Math.max(...perDay.map((d) => d.minutes), 0)
  const todayIndex = (new Date().getDay() + 6) % 7

  // Keep small-but-real values visible instead of a 1px sliver.
  const fill = (value: number, max: number) =>
    value <= 0 || max <= 0 ? 0 : Math.max(10, (value / max) * 100)

  return (
    <>
      {/* No items-end here: the columns must stretch to the container height,
          otherwise the flex-1 bar area collapses to zero and nothing renders. */}
      <div className="mt-4 flex gap-2" style={{ height: 96 }}>
        {perDay.map((day, i) => {
          const trained = day.workouts > 0
          const detail = trained
            ? `${Math.round(day.volume_kg).toLocaleString()} kg · ${day.minutes} min`
            : 'rest day'

          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="flex w-full flex-1 gap-[3px]"
                title={`${WEEKDAYS[i].long}: ${detail}`}
              >
                {/* Bars are absolutely positioned against a relative track, so
                    their height never depends on percentage-height inheritance. */}
                <div className="relative flex-1 overflow-hidden rounded-sm bg-parchment">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-sm bg-primary"
                    style={{ height: `${fill(day.volume_kg, maxVolume)}%` }}
                  />
                </div>
                <div className="relative flex-1 overflow-hidden rounded-sm bg-parchment">
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-sm bg-primary-strong"
                    style={{ height: `${fill(day.minutes, maxMinutes)}%` }}
                  />
                </div>
              </div>
              <span
                className={`text-[11px] ${
                  i === todayIndex
                    ? 'font-semibold text-ink'
                    : trained
                      ? 'text-primary'
                      : 'text-ink-soft'
                }`}
              >
                {WEEKDAYS[i].short}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-center gap-4 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary" /> Volume
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary-strong" /> Duration
        </span>
        <span className="ml-auto hidden sm:inline">scaled separately</span>
      </div>
    </>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Dashboard>('/api/dashboard')
      .then(setData)
      .catch(() => setError('Could not load your dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  const firstName = (user?.display_name || '').split(' ')[0]

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>
  if (!data) return <ErrorNote>{error}</ErrorNote>

  const { week, bodyweight, today, last_session: last } = data
  const mealLabel = (value: string) =>
    MEAL_TYPES.find((m) => m.value === value)?.label ?? value

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        Welcome back{firstName ? `, ${firstName}` : ''}.
      </h1>
      <p className="mt-2 text-sm text-ink-soft">Ready to crush today's goals?</p>

      {data.active_session_id && (
        <Link to={`/training/session/${data.active_session_id}`} className="mt-6 block">
          <div className={`${cardCls} border-l-4 border-primary p-5 transition-colors hover:bg-primary-tint/30`}>
            <Tag>In progress</Tag>
            <p className="mt-2 font-semibold">You have a workout running — tap to continue.</p>
          </div>
        </Link>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Last session */}
        <div className={`${cardCls} p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Last session
            </h2>
            {last && <span className="text-xs text-ink-soft">{formatDate(last.date)}</span>}
          </div>
          {last ? (
            <>
              <p className="mt-2 text-xl font-semibold">
                {last.routine_name ?? 'Free workout'}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'duration', value: last.duration_minutes != null ? `${last.duration_minutes}m` : '–' },
                  { label: 'volume', value: `${Math.round(last.total_volume_kg).toLocaleString()} kg` },
                  { label: 'sets', value: last.total_sets },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-lg font-semibold text-primary-strong">{s.value}</div>
                    <div className="text-[11px] uppercase tracking-wide text-ink-soft">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              No finished workouts yet — your first one will show up here.
            </p>
          )}
          <Link to="/training" className="mt-4 inline-block">
            <Button variant="secondary">
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4" /> Start a workout
              </span>
            </Button>
          </Link>
        </div>

        {/* Weekly activity */}
        <div className={`${cardCls} p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              This week
            </h2>
            <Dumbbell className="h-4 w-4 text-ink-soft" />
          </div>
          <WeeklyActivity perDay={week.per_day} />
          <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
            <span>
              <span className="text-lg font-semibold">{week.workouts}</span>{' '}
              <span className="text-ink-soft">workout{week.workouts === 1 ? '' : 's'}</span>
            </span>
            <span className="text-ink-soft">
              {week.total_minutes > 0 && `${week.total_minutes} min · `}
              {Math.round(week.total_volume_kg).toLocaleString()} kg
            </span>
          </div>
        </div>

        {/* Today's meals */}
        <div className={`${cardCls} p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Today's meals
            </h2>
            <UtensilsCrossed className="h-4 w-4 text-ink-soft" />
          </div>
          {today.meals.length > 0 ? (
            <>
              <ul className="mt-3 divide-y divide-line">
                {today.meals.map((meal) => (
                  <li key={meal.id} className="flex items-center gap-3 py-2">
                    <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-ink-soft">
                      {mealLabel(meal.meal_type)}
                    </span>
                    <Link
                      to={`/recipes/${meal.recipe_id}`}
                      className="min-w-0 flex-1 truncate text-sm hover:text-primary"
                    >
                      {meal.recipe_title}
                    </Link>
                    <span className="shrink-0 text-xs text-ink-soft">
                      {Math.round(meal.calories)} kcal
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
                <span className="font-semibold">
                  {Math.round(today.calories)} kcal
                </span>
                <span className="text-ink-soft">
                  P {today.protein_g} · C {today.carbs_g} · F {today.fat_g}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-ink-soft">Nothing planned for today.</p>
              <Link to="/shopping" className="mt-4 inline-block">
                <Button variant="secondary">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> Plan the week
                  </span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Bodyweight */}
        <div className={`${cardCls} p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Bodyweight
            </h2>
            <Scale className="h-4 w-4 text-ink-soft" />
          </div>
          {bodyweight.current != null ? (
            <>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-2xl font-semibold text-primary-strong">
                  {bodyweight.current} kg
                </span>
                {bodyweight.change_kg != null && bodyweight.change_kg !== 0 && (
                  <span className="text-sm text-ink-soft">
                    {bodyweight.change_kg > 0 ? '+' : ''}
                    {bodyweight.change_kg} kg recently
                  </span>
                )}
              </div>
              <Sparkline values={bodyweight.entries.map((e) => e.weight_kg)} />
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">No entries yet.</p>
          )}
          <Link to="/bodyweight" className="mt-4 inline-block">
            <Button variant="secondary">Log weight</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
