import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '../api/client'
import type { MealType, Recipe } from '../api/types'
import { MEAL_TYPES } from '../constants'
import { ErrorNote, Tag } from './ui'

/** Pick a recipe for one meal slot; defaults to that slot's meal type. */
export function RecipePicker({
  mealType,
  onPick,
  onClose,
}: {
  mealType: MealType
  onPick: (recipe: Recipe) => void
  onClose: () => void
}) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filter, setFilter] = useState<MealType | 'all'>(mealType)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Recipe[]>('/api/recipes')
      .then(setRecipes)
      .catch(() => setError('Could not load recipes.'))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return recipes
      .filter((r) => filter === 'all' || r.meal_type === filter)
      .filter((r) => !q || r.title.toLowerCase().includes(q))
  }, [recipes, filter, search])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/20 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line p-4">
          <div className="flex items-center gap-3">
            <Search className="h-4 w-4 shrink-0 text-ink-soft" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button onClick={onClose} aria-label="Close" className="p-1 text-ink-soft">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {[{ value: 'all', label: 'All' } as const, ...MEAL_TYPES].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as MealType | 'all')}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === tab.value
                    ? 'bg-primary text-white'
                    : 'bg-parchment text-ink-soft hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {error && <div className="px-2"><ErrorNote>{error}</ErrorNote></div>}
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-soft">No recipes found.</p>
          ) : (
            visible.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => onPick(recipe)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-primary-tint"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{recipe.title}</div>
                  <div className="text-xs text-ink-soft">
                    {Math.round(recipe.calories)} kcal · {recipe.protein_g} g protein ·{' '}
                    {recipe.servings} serving{recipe.servings === 1 ? '' : 's'}
                  </div>
                </div>
                {!recipe.is_global && <Tag>Mine</Tag>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
