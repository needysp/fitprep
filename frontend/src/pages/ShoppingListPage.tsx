import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { MealPlan, MealType, ShoppingList } from '../api/types'
import { INGREDIENT_CATEGORIES, MEAL_TYPES, WEEKDAYS } from '../constants'
import { RecipePicker } from '../components/RecipePicker'
import { Button, ErrorNote, PageHeader, cardCls } from '../components/ui'

/** The ISO Monday of the week containing `d`. */
function mondayOf(d: Date) {
  const copy = new Date(d)
  const offset = (copy.getDay() + 6) % 7 // Sunday(0) -> 6
  copy.setDate(copy.getDate() - offset)
  copy.setHours(12, 0, 0, 0) // midday avoids DST edge cases
  return copy
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

export function ShoppingListPage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [tab, setTab] = useState<'plan' | 'list'>('plan')
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [list, setList] = useState<ShoppingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [picking, setPicking] = useState<{ day: number; mealType: MealType } | null>(null)

  const weekIso = toIso(weekStart)

  const load = useCallback(async () => {
    const [p, l] = await Promise.all([
      api.get<MealPlan>(`/api/mealplan?week_start=${weekIso}`),
      api.get<ShoppingList>(`/api/shopping-list?week_start=${weekIso}`),
    ])
    setPlan(p)
    setList(l)
  }, [weekIso])

  useEffect(() => {
    setLoading(true)
    load()
      .catch(() => setError('Could not load this week.'))
      .finally(() => setLoading(false))
  }, [load])

  function shiftWeek(deltaWeeks: number) {
    const next = new Date(weekStart)
    next.setDate(next.getDate() + deltaWeeks * 7)
    setWeekStart(next)
  }

  async function addMeal(day: number, mealType: MealType, recipeId: number) {
    setError('')
    try {
      await api.post(`/api/mealplan?week_start=${weekIso}`, {
        day_of_week: day,
        meal_type: mealType,
        recipe_id: recipeId,
      })
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add that meal.')
    }
  }

  async function removeMeal(itemId: number) {
    setError('')
    try {
      await api.del(`/api/mealplan/${itemId}`)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove that meal.')
    }
  }

  async function toggle(ingredientItemId: number, checked: boolean) {
    // Optimistic: ticking things off should feel instant in a shop.
    setList((current) =>
      current
        ? {
            ...current,
            checked_items: current.checked_items + (checked ? 1 : -1),
            groups: current.groups.map((g) => ({
              ...g,
              items: g.items.map((i) =>
                i.ingredient_item_id === ingredientItemId ? { ...i, checked } : i,
              ),
            })),
          }
        : current,
    )
    try {
      await api.put(`/api/shopping-list/check?week_start=${weekIso}`, {
        ingredient_item_id: ingredientItemId,
        checked,
      })
    } catch {
      setError('Could not save that tick — reloading.')
      await load()
    }
  }

  async function clearChecks() {
    try {
      await api.post(`/api/shopping-list/clear?week_start=${weekIso}`)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not clear the list.')
    }
  }

  const isThisWeek = weekIso === toIso(mondayOf(new Date()))

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Meal plan"
          description="Plan the week, then shop from one aggregated list."
        />
      </div>

      {/* Week navigation */}
      <div className={`${cardCls} mt-6 flex items-center justify-between gap-2 p-3 print:hidden`}>
        <button
          onClick={() => shiftWeek(-1)}
          aria-label="Previous week"
          className="rounded-lg p-2 text-ink-soft hover:bg-primary-tint hover:text-ink"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">
            {shortDate(weekIso)} – {shortDate(toIso(new Date(weekStart.getTime() + 6 * 864e5)))}
          </div>
          <div className="text-xs text-ink-soft">
            {isThisWeek ? 'This week' : 'Week of ' + shortDate(weekIso)}
          </div>
        </div>
        <button
          onClick={() => shiftWeek(1)}
          aria-label="Next week"
          className="rounded-lg p-2 text-ink-soft hover:bg-primary-tint hover:text-ink"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 flex gap-1 rounded-xl bg-parchment p-1 print:hidden">
        {(
          [
            { key: 'plan', label: 'Plan' },
            { key: 'list', label: `Shopping list${list ? ` (${list.total_items})` : ''}` },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-primary-strong shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="print:hidden">
        <ErrorNote>{error}</ErrorNote>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-ink-soft">Loading…</p>
      ) : tab === 'plan' ? (
        <PlanView
          plan={plan}
          onAdd={(day, mealType) => setPicking({ day, mealType })}
          onRemove={removeMeal}
        />
      ) : (
        <ListView list={list} onToggle={toggle} onClear={clearChecks} weekIso={weekIso} />
      )}

      {picking && (
        <RecipePicker
          mealType={picking.mealType}
          onClose={() => setPicking(null)}
          onPick={(recipe) => {
            const { day, mealType } = picking
            setPicking(null)
            addMeal(day, mealType, recipe.id)
          }}
        />
      )}
    </div>
  )
}

function PlanView({
  plan,
  onAdd,
  onRemove,
}: {
  plan: MealPlan | null
  onAdd: (day: number, mealType: MealType) => void
  onRemove: (itemId: number) => void
}) {
  if (!plan) return null

  return (
    <div>
      {plan.average_calories > 0 && (
        <div className={`${cardCls} mt-4 flex flex-wrap gap-6 p-5`}>
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-soft">Daily average</div>
            <div className="mt-1 text-2xl font-semibold text-primary-strong">
              {Math.round(plan.average_calories)} kcal
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-soft">Protein / day</div>
            <div className="mt-1 text-2xl font-semibold text-primary-strong">
              {plan.average_protein_g} g
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-soft">Meals planned</div>
            <div className="mt-1 text-2xl font-semibold text-primary-strong">
              {plan.items.length}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {plan.days.map((day) => (
          <div key={day.day_of_week} className={`${cardCls} p-5`}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold">{WEEKDAYS[day.day_of_week].long}</h3>
              <span className="text-xs text-ink-soft">
                {day.meals > 0
                  ? `${Math.round(day.calories)} kcal · ${day.protein_g} g protein`
                  : 'nothing planned'}
              </span>
            </div>

            <div className="mt-3 flex flex-col divide-y divide-line">
              {MEAL_TYPES.map((meal) => {
                const items = plan.items.filter(
                  (i) => i.day_of_week === day.day_of_week && i.meal_type === meal.value,
                )
                return (
                  <div key={meal.value} className="flex items-start gap-2 py-2">
                    <span className="w-20 shrink-0 pt-1 text-xs uppercase tracking-wide text-ink-soft">
                      {meal.label}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Link
                            to={`/recipes/${item.recipe_id}`}
                            className="min-w-0 flex-1 truncate text-sm hover:text-primary"
                          >
                            {item.recipe_title}
                          </Link>
                          <span className="shrink-0 text-xs text-ink-soft">
                            {Math.round(item.calories)} kcal
                          </span>
                          <button
                            onClick={() => onRemove(item.id)}
                            aria-label={`Remove ${item.recipe_title}`}
                            className="shrink-0 rounded p-1 text-ink-soft hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => onAdd(day.day_of_week, meal.value)}
                        className="flex items-center gap-1 self-start rounded-lg px-1 py-0.5 text-xs font-medium text-primary hover:bg-primary-tint"
                      >
                        <Plus className="h-3 w-3" />
                        {items.length > 0 ? 'Add another' : 'Add'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ListView({
  list,
  onToggle,
  onClear,
  weekIso,
}: {
  list: ShoppingList | null
  onToggle: (id: number, checked: boolean) => void
  onClear: () => void
  weekIso: string
}) {
  if (!list) return null

  if (list.total_items === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-ink-soft">
        Nothing to buy yet — plan some meals for this week first.
      </div>
    )
  }

  const label = (category: string) =>
    INGREDIENT_CATEGORIES.find((c) => c.value === category)?.label ?? category

  return (
    <div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          <span className="font-medium text-ink">
            {list.checked_items} / {list.total_items}
          </span>{' '}
          in the basket
        </p>
        <div className="flex gap-2 print:hidden">
          <Button variant="secondary" onClick={onClear}>
            <span className="flex items-center gap-2">
              <Eraser className="h-4 w-4" /> Clear all
            </span>
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <span className="flex items-center gap-2">
              <Printer className="h-4 w-4" /> Print
            </span>
          </Button>
        </div>
      </div>

      <div className="mt-2 hidden print:block">
        <h1 className="text-lg font-semibold">Shopping list — week of {weekIso}</h1>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {list.groups.map((group) => (
          <section key={group.category} className={`${cardCls} overflow-hidden`}>
            <header className="flex items-center gap-2 border-b border-line px-5 py-3">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">{label(group.category)}</h2>
              <span className="ml-auto text-xs text-ink-soft">{group.items.length}</span>
            </header>
            <ul>
              {group.items.map((item) => (
                <li key={item.ingredient_item_id}>
                  <label className="flex cursor-pointer items-start gap-3 px-5 py-3 transition-colors hover:bg-primary-tint/30">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => onToggle(item.ingredient_item_id, e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[#d97757]"
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-medium ${
                          item.checked ? 'text-ink-soft line-through' : ''
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="block truncate text-xs text-ink-soft">
                        {item.used_in.join(', ')}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        item.checked ? 'text-ink-soft line-through' : 'text-primary-strong'
                      }`}
                    >
                      {item.quantity}
                      {item.unit === 'piece' ? '×' : ` ${item.unit}`}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
