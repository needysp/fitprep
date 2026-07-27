import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Clock, Users } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { RecipeDetail } from '../api/types'
import { INGREDIENT_CATEGORIES } from '../constants'
import { MacroRow, RecipeImage, mealTypeLabel } from '../components/RecipeBits'
import { Button, ErrorNote, Tag, cardCls } from '../components/ui'

/** 0.5 -> "½", 1 -> "1", 1.5 -> "1½" — quantities read better than decimals. */
function formatQuantity(quantity: number) {
  const whole = Math.floor(quantity)
  const fraction = quantity - whole
  const glyph = fraction === 0.5 ? '½' : fraction === 0.25 ? '¼' : fraction === 0.75 ? '¾' : ''
  if (glyph) return whole > 0 ? `${whole}${glyph}` : glyph
  return String(Math.round(quantity * 100) / 100)
}

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function remove() {
    setError('')
    try {
      await api.del(`/api/recipes/${id}`)
      navigate('/recipes', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the recipe.')
    }
  }

  useEffect(() => {
    api
      .get<RecipeDetail>(`/api/recipes/${id}`)
      .then(setRecipe)
      .catch(() => setError('Could not load this recipe.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>
  if (!recipe) return <ErrorNote>{error || 'Recipe not found.'}</ErrorNote>

  // Group the ingredients by supermarket department, in aisle order.
  const grouped = INGREDIENT_CATEGORIES.map((category) => ({
    ...category,
    items: recipe.ingredients.filter((i) => i.category === category.value),
  })).filter((group) => group.items.length > 0)

  const steps = recipe.instructions
    .split('\n')
    .map((line) => line.trim().replace(/^\d+\.\s*/, ''))
    .filter(Boolean)

  return (
    <div>
      <Link
        to="/recipes"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> Recipes
      </Link>

      <div className={`${cardCls} mt-3 overflow-hidden`}>
        <div className="h-48 w-full sm:h-60">
          <RecipeImage recipe={recipe} />
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag>{mealTypeLabel(recipe.meal_type)}</Tag>
            {!recipe.is_global && <Tag>Mine</Tag>}
            {recipe.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {recipe.title}
            </h1>
            {recipe.can_edit && (
              <div className="flex gap-1">
                <Link to={`/recipes/${recipe.id}/edit`}>
                  <Button variant="secondary">Edit</Button>
                </Link>
                <Button variant="danger" onClick={remove}>
                  Delete
                </Button>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-soft">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {recipe.prep_minutes} min
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {recipe.servings} serving
              {recipe.servings === 1 ? '' : 's'}
            </span>
          </div>
          <ErrorNote>{error}</ErrorNote>
        </div>
      </div>

      <section className={`${cardCls} mt-4 p-6`}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Per serving
        </h2>
        <div className="mt-3">
          <MacroRow recipe={recipe} size="lg" />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <section className={`${cardCls} p-6`}>
          <h2 className="font-semibold">Ingredients</h2>
          <p className="mt-1 text-xs text-ink-soft">
            For all {recipe.servings} serving{recipe.servings === 1 ? '' : 's'}.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            {grouped.map((group) => (
              <div key={group.value}>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  {group.label}
                </div>
                <ul className="mt-1.5 divide-y divide-line">
                  {group.items.map((item) => (
                    <li
                      key={item.ingredient_item_id}
                      className="flex items-baseline justify-between gap-3 py-1.5 text-sm"
                    >
                      <span>{item.name}</span>
                      <span className="shrink-0 font-medium tabular-nums text-ink-soft">
                        {formatQuantity(item.quantity)}
                        {item.unit === 'piece' ? '' : ` ${item.unit}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className={`${cardCls} p-6`}>
          <h2 className="font-semibold">Method</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary-strong">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
