import { useState } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import type { MealType, Recipe } from '../api/types'

/** Recipe photo, or a tinted fallback when no image URL is set (or it fails). */
export function RecipeImage({
  recipe,
  className = '',
}: {
  recipe: Recipe
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = recipe.image_url && !failed

  if (showImage) {
    return (
      <img
        src={recipe.image_url as string}
        alt={recipe.title}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-tint to-parchment ${className}`}
    >
      <UtensilsCrossed className="h-8 w-8 text-primary/40" />
    </div>
  )
}

/** Per-serving macro strip — the four numbers, consistently ordered. */
export function MacroRow({ recipe, size = 'sm' }: { recipe: Recipe; size?: 'sm' | 'lg' }) {
  const macros = [
    { label: 'kcal', value: Math.round(recipe.calories) },
    { label: 'protein', value: `${recipe.protein_g} g` },
    { label: 'carbs', value: `${recipe.carbs_g} g` },
    { label: 'fat', value: `${recipe.fat_g} g` },
  ]
  const big = size === 'lg'
  return (
    <div className={`grid grid-cols-4 ${big ? 'gap-3' : 'gap-1'}`}>
      {macros.map((m) => (
        <div key={m.label}>
          <div
            className={`font-semibold text-primary-strong ${big ? 'text-xl' : 'text-sm'}`}
          >
            {m.value}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-ink-soft">{m.label}</div>
        </div>
      ))}
    </div>
  )
}

export function mealTypeLabel(mealType: MealType) {
  return mealType === 'snack' ? 'Snacks' : mealType[0].toUpperCase() + mealType.slice(1)
}
