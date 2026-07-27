import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Search } from 'lucide-react'
import { api } from '../api/client'
import type { MealType, Recipe } from '../api/types'
import { MEAL_TYPES } from '../constants'
import { MacroRow, RecipeImage } from '../components/RecipeBits'
import { EmptyState, ErrorNote, PageHeader, Tag, cardCls, inputCls } from '../components/ui'

function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className={`${cardCls} group flex flex-col overflow-hidden transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]`}
    >
      <div className="relative h-36 w-full shrink-0">
        <RecipeImage recipe={recipe} />
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-ink-soft backdrop-blur">
          <Clock className="h-3 w-3" />
          {recipe.prep_minutes}m
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {recipe.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 2).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
        <h3 className="font-semibold leading-snug">{recipe.title}</h3>
        <p className="mt-1 text-xs text-ink-soft">
          {recipe.servings} serving{recipe.servings === 1 ? '' : 's'}
        </p>
        <div className="mt-auto pt-4">
          <MacroRow recipe={recipe} />
        </div>
      </div>
    </Link>
  )
}

export function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [mealType, setMealType] = useState<MealType>('breakfast')
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
    return recipes.filter(
      (r) =>
        r.meal_type === mealType &&
        (!q ||
          r.title.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))),
    )
  }, [recipes, mealType, search])

  return (
    <div>
      <PageHeader
        title="Recipes"
        description="Meal-prep friendly recipes with the macros worked out per serving."
      />

      <ErrorNote>{error}</ErrorNote>

      {/* Meal-type tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl bg-parchment p-1">
        {MEAL_TYPES.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setMealType(tab.value)}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mealType === tab.value
                ? 'bg-white text-primary-strong shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes and tags…"
          className={`${inputCls} pl-9`}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <EmptyState>Loading…</EmptyState>
          </div>
        ) : visible.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <EmptyState>
              {search ? 'No recipes match that search.' : 'No recipes in this category yet.'}
            </EmptyState>
          </div>
        ) : (
          visible.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)
        )}
      </div>
    </div>
  )
}
