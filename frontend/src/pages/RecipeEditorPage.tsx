import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { IngredientItem, MealType, RecipeDetail } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { IngredientPicker } from '../components/IngredientPicker'
import { MEAL_TYPES } from '../constants'
import { Button, ErrorNote, cardCls, inputCls } from '../components/ui'

interface Row {
  item: IngredientItem
  quantity: string
}

export function RecipeEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [servings, setServings] = useState('2')
  const [prepMinutes, setPrepMinutes] = useState('20')
  const [tags, setTags] = useState('')
  const [instructions, setInstructions] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [isGlobal, setIsGlobal] = useState(false)

  const [picking, setPicking] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) return
    Promise.all([
      api.get<RecipeDetail>(`/api/recipes/${id}`),
      api.get<IngredientItem[]>('/api/ingredients'),
    ])
      .then(([recipe, catalog]) => {
        setTitle(recipe.title)
        setMealType(recipe.meal_type)
        setServings(String(recipe.servings))
        setPrepMinutes(String(recipe.prep_minutes))
        setTags(recipe.tags.join(', '))
        setInstructions(recipe.instructions)
        setImageUrl(recipe.image_url ?? '')
        setIsGlobal(recipe.is_global)
        const byId = new Map(catalog.map((i) => [i.id, i]))
        setRows(
          recipe.ingredients
            .map((ri) => {
              const item = byId.get(ri.ingredient_item_id)
              return item ? { item, quantity: String(ri.quantity) } : null
            })
            .filter((r): r is Row => r !== null),
        )
      })
      .catch(() => setError('Could not load this recipe.'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  // Mirrors the server's computation so the numbers move as you type.
  const preview = useMemo(() => {
    const perServing = Math.max(1, Number(servings) || 1)
    const totals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    for (const row of rows) {
      const qty = Number(row.quantity) || 0
      const hundreds = (qty * row.item.grams_per_unit) / 100
      totals.calories += row.item.kcal_per_100 * hundreds
      totals.protein_g += row.item.protein_per_100 * hundreds
      totals.carbs_g += row.item.carbs_per_100 * hundreds
      totals.fat_g += row.item.fat_per_100 * hundreds
    }
    return {
      calories: Math.round(totals.calories / perServing),
      protein_g: (totals.protein_g / perServing).toFixed(1),
      carbs_g: (totals.carbs_g / perServing).toFixed(1),
      fat_g: (totals.fat_g / perServing).toFixed(1),
    }
  }, [rows, servings])

  async function save() {
    setError('')
    setSaving(true)
    const body = {
      title,
      meal_type: mealType,
      servings: Number(servings) || 1,
      prep_minutes: Number(prepMinutes) || 0,
      instructions,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      image_url: imageUrl.trim() || null,
      ingredients: rows.map((r) => ({
        ingredient_item_id: r.item.id,
        quantity: Number(r.quantity) || 0,
      })),
      is_global: isGlobal,
    }
    try {
      const saved = isEdit
        ? await api.put<RecipeDetail>(`/api/recipes/${id}`, body)
        : await api.post<RecipeDetail>('/api/recipes', body)
      navigate(`/recipes/${saved.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the recipe.')
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>

  const canSave =
    title.trim().length > 0 && rows.length > 0 && rows.every((r) => Number(r.quantity) > 0)

  return (
    <div>
      <Link
        to={isEdit ? `/recipes/${id}` : '/recipes'}
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> {isEdit ? 'Recipe' : 'Recipes'}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
        {isEdit ? 'Edit recipe' : 'New recipe'}
      </h1>

      <ErrorNote>{error}</ErrorNote>

      <div className={`${cardCls} mt-6 p-6`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Skyr Protein Bowl"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Meal type
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className={inputCls}
            >
              {MEAL_TYPES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Servings
              <input
                type="number"
                min={1}
                max={50}
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Prep (min)
              <input
                type="number"
                min={0}
                value={prepMinutes}
                onChange={(e) => setPrepMinutes(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Tags (comma separated)
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="High Protein, Meal Prep"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Photo URL (optional)
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
          </label>
        </div>
      </div>

      {/* Ingredients + live macros */}
      <div className={`${cardCls} mt-4 p-6`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Ingredients</h2>
          <p className="text-xs text-ink-soft">Quantities for all {servings || 1} servings</p>
        </div>

        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            Add ingredients — the macros are worked out from them.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {rows.map((row, i) => (
              <li
                key={row.item.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-3"
              >
                <span className="flex-1 text-sm font-medium">{row.item.name}</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={row.quantity}
                  onChange={(e) =>
                    setRows(
                      rows.map((r, idx) =>
                        idx === i ? { ...r, quantity: e.target.value } : r,
                      ),
                    )
                  }
                  className={`${inputCls} w-24`}
                />
                <span className="w-12 text-xs text-ink-soft">{row.item.default_unit}</span>
                <button
                  onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                  aria-label={`Remove ${row.item.name}`}
                  className="rounded-lg p-2 text-ink-soft hover:bg-danger/5 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Button variant="secondary" className="mt-3" onClick={() => setPicking(true)}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add ingredient
          </span>
        </Button>

        <div className="mt-6 rounded-xl bg-parchment p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Per serving
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[
              { label: 'kcal', value: preview.calories },
              { label: 'protein', value: `${preview.protein_g} g` },
              { label: 'carbs', value: `${preview.carbs_g} g` },
              { label: 'fat', value: `${preview.fat_g} g` },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-lg font-semibold text-primary-strong">{m.value}</div>
                <div className="text-[11px] uppercase tracking-wide text-ink-soft">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${cardCls} mt-4 p-6`}>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Method
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={'One step per line:\nMix the oats and yogurt.\nChill overnight.'}
            className={`${inputCls} min-h-40 resize-y`}
          />
        </label>

        {user?.role === 'admin' && (
          <label className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.target.checked)}
              className="accent-[#d97757]"
            />
            Publish to the shared catalog (visible to everyone)
          </label>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <Button onClick={save} disabled={saving || !canSave}>
          {saving ? 'Saving…' : 'Save recipe'}
        </Button>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
      {!canSave && (
        <p className="mt-2 text-xs text-ink-soft">
          A title and at least one ingredient with a quantity are needed.
        </p>
      )}

      {picking && (
        <IngredientPicker
          excludeIds={rows.map((r) => r.item.id)}
          onClose={() => setPicking(false)}
          onPick={(item) => {
            setRows([...rows, { item, quantity: '' }])
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}
