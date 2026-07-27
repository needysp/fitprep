import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { api, ApiError } from '../api/client'
import type { IngredientCategory, IngredientItem } from '../api/types'
import { INGREDIENT_CATEGORIES } from '../constants'
import { Button, ErrorNote, Tag, inputCls } from './ui'

const UNITS = ['g', 'ml', 'piece', 'slice'] as const

/** Pick an ingredient from the shared catalog, or add one that isn't there yet. */
export function IngredientPicker({
  onPick,
  onClose,
  excludeIds = [],
}: {
  onPick: (item: IngredientItem) => void
  onClose: () => void
  excludeIds?: number[]
}) {
  const [items, setItems] = useState<IngredientItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [category, setCategory] = useState<IngredientCategory>('other')
  const [unit, setUnit] = useState<string>('g')
  const [gramsPerUnit, setGramsPerUnit] = useState('1')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')

  useEffect(() => {
    api
      .get<IngredientItem[]>('/api/ingredients')
      .then(setItems)
      .catch(() => setError('Could not load ingredients.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items
      .filter((i) => !excludeIds.includes(i.id))
      .filter((i) => !q || i.name.toLowerCase().includes(q))
  }, [items, search, excludeIds])

  const exactMatch = items.some(
    (i) => i.name.toLowerCase() === search.trim().toLowerCase(),
  )

  // Piece-based units need a real weight so macros can be computed.
  const needsWeight = unit !== 'g' && unit !== 'ml'

  async function handleCreate() {
    setError('')
    setSaving(true)
    try {
      const created = await api.post<IngredientItem>('/api/ingredients', {
        name: search.trim(),
        category,
        default_unit: unit,
        grams_per_unit: needsWeight ? Number(gramsPerUnit) : 1,
        kcal_per_100: Number(kcal) || 0,
        protein_per_100: Number(protein) || 0,
        carbs_per_100: Number(carbs) || 0,
        fat_per_100: Number(fat) || 0,
      })
      onPick(created)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the ingredient.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/20 backdrop-blur-sm sm:items-center sm:p-4"
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
            placeholder="Search or type a new ingredient…"
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
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onPick(item)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary-tint"
                >
                  <span className="flex-1">{item.name}</span>
                  <span className="text-xs text-ink-soft">
                    {Math.round(item.kcal_per_100)} kcal/100{item.default_unit === 'ml' ? 'ml' : 'g'}
                  </span>
                  <Tag>{item.category}</Tag>
                </button>
              ))}

              {search.trim() && !exactMatch && (
                <div className="border-t border-line p-3">
                  {!creating ? (
                    <button
                      onClick={() => setCreating(true)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-primary-tint"
                    >
                      <Plus className="h-4 w-4" />
                      Add “{search.trim()}” to the catalog
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3 p-1">
                      <p className="text-sm font-medium">Add “{search.trim()}”</p>
                      <p className="text-xs text-ink-soft">
                        Nutrition per 100 {unit === 'ml' ? 'ml' : 'g'} — this is what lets the
                        app work out your recipe's macros.
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1.5 text-xs font-medium">
                          Department
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as IngredientCategory)}
                            className={inputCls}
                          >
                            {INGREDIENT_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1.5 text-xs font-medium">
                          Measured in
                          <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className={inputCls}
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {needsWeight && (
                        <label className="flex flex-col gap-1.5 text-xs font-medium">
                          Weight of one {unit} (g)
                          <input
                            type="number"
                            min={1}
                            value={gramsPerUnit}
                            onChange={(e) => setGramsPerUnit(e.target.value)}
                            placeholder="e.g. 55 for an egg"
                            className={inputCls}
                          />
                        </label>
                      )}

                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'kcal', value: kcal, set: setKcal },
                          { label: 'Protein', value: protein, set: setProtein },
                          { label: 'Carbs', value: carbs, set: setCarbs },
                          { label: 'Fat', value: fat, set: setFat },
                        ].map((f) => (
                          <label key={f.label} className="flex flex-col gap-1.5 text-xs font-medium">
                            {f.label}
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              value={f.value}
                              onChange={(e) => f.set(e.target.value)}
                              placeholder="0"
                              className={inputCls}
                            />
                          </label>
                        ))}
                      </div>

                      <Button onClick={handleCreate} disabled={saving}>
                        {saving ? 'Adding…' : 'Add & use'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {filtered.length === 0 && !search.trim() && (
                <p className="px-4 py-8 text-center text-sm text-ink-soft">
                  No ingredients yet.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
