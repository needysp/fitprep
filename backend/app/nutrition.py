"""Macro computation — the single place recipe macros are derived.

Used both by the seed and by the recipe write endpoints so a user-written recipe
gets its numbers exactly the same way a seeded one does.
"""

from collections.abc import Iterable

from .models import IngredientItem

MACRO_FIELDS = ("calories", "protein_g", "carbs_g", "fat_g")


def compute_macros(
    items: Iterable[tuple[IngredientItem, float]], servings: int
) -> dict[str, float]:
    """Per-serving macros for (ingredient, quantity-in-its-default-unit) pairs."""
    totals = dict.fromkeys(MACRO_FIELDS, 0.0)
    for item, quantity in items:
        # grams_per_unit is 1 for g/ml, so this is quantity/100 there.
        hundreds = quantity * item.grams_per_unit / 100
        totals["calories"] += item.kcal_per_100 * hundreds
        totals["protein_g"] += item.protein_per_100 * hundreds
        totals["carbs_g"] += item.carbs_per_100 * hundreds
        totals["fat_g"] += item.fat_per_100 * hundreds
    divisor = max(1, servings)
    return {key: round(value / divisor, 1) for key, value in totals.items()}
