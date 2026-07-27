"""Seed the global catalogs. Idempotent — safe to re-run.

Run with:  python -m app.seed
"""

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .database import SessionLocal
from .models import Exercise, IngredientItem, Recipe, RecipeIngredient
from .nutrition import compute_macros
from .recipe_data import INGREDIENTS, RECIPES

# Global starter exercises (created_by_user_id stays NULL). guide_url is left
# empty on purpose: fitundattraktiv.de uses article-style slugs that can't be
# derived from an exercise name, so links are filled in per exercise from the
# UI rather than guessed here (a wrong link is worse than none).
STARTER_EXERCISES: list[tuple[str, str]] = [
    # Chest
    ("Bench Press", "chest"),
    ("Incline Dumbbell Press", "chest"),
    ("Cable Fly", "chest"),
    ("Push-Up", "chest"),
    # Back
    ("Deadlift", "back"),
    ("Pull-Up", "back"),
    ("Barbell Row", "back"),
    ("Lat Pulldown", "back"),
    ("Seated Cable Row", "back"),
    # Legs
    ("Squat", "legs"),
    ("Leg Press", "legs"),
    ("Romanian Deadlift", "legs"),
    ("Leg Curl", "legs"),
    ("Leg Extension", "legs"),
    ("Calf Raise", "legs"),
    # Shoulders
    ("Overhead Press", "shoulders"),
    ("Lateral Raise", "shoulders"),
    ("Face Pull", "shoulders"),
    # Arms
    ("Barbell Curl", "arms"),
    ("Dumbbell Curl", "arms"),
    ("Triceps Pushdown", "arms"),
    ("Skull Crusher", "arms"),
    # Core
    ("Plank", "core"),
    ("Hanging Leg Raise", "core"),
    ("Cable Crunch", "core"),
]


def seed_exercises(db: Session) -> int:
    existing = {
        name
        for name in db.scalars(
            select(Exercise.name).where(Exercise.created_by_user_id.is_(None))
        )
    }
    added = 0
    for name, muscle_group in STARTER_EXERCISES:
        if name in existing:
            continue
        db.add(Exercise(name=name, muscle_group=muscle_group, guide_url=""))
        added += 1
    db.commit()
    return added


def seed_ingredients(db: Session) -> int:
    """Upsert the canonical ingredient catalog. Returns the number created."""
    existing = {item.name: item for item in db.scalars(select(IngredientItem))}
    created = 0
    for definition in INGREDIENTS:
        item = existing.get(definition.name)
        if item is None:
            item = IngredientItem(name=definition.name)
            db.add(item)
            created += 1
        item.category = definition.category
        item.default_unit = definition.unit
        item.kcal_per_100 = definition.kcal
        item.protein_per_100 = definition.protein
        item.carbs_per_100 = definition.carbs
        item.fat_per_100 = definition.fat
        item.grams_per_unit = definition.grams_per_unit
    db.commit()
    return created


def seed_recipes(db: Session) -> tuple[int, int]:
    """Upsert the starter recipes as global entries. Returns (created, updated)."""
    items = {item.name: item for item in db.scalars(select(IngredientItem))}
    existing = {
        recipe.title: recipe
        for recipe in db.scalars(
            select(Recipe)
            .where(Recipe.created_by_user_id.is_(None))
            .options(selectinload(Recipe.ingredients))
        )
    }

    created = updated = 0
    for definition in RECIPES:
        macros = compute_macros(
            ((items[name], quantity) for name, quantity in definition.ingredients),
            definition.servings,
        )
        recipe = existing.get(definition.title)
        if recipe is None:
            recipe = Recipe(title=definition.title)
            db.add(recipe)
            created += 1
        else:
            updated += 1

        recipe.meal_type = definition.meal_type
        recipe.servings = definition.servings
        recipe.prep_minutes = definition.prep_minutes
        recipe.instructions = definition.instructions
        recipe.tags = list(definition.tags)
        # No stock photos are invented: cards render a fallback until a real
        # image URL is set.
        recipe.image_url = recipe.image_url or None
        for key, value in macros.items():
            setattr(recipe, key, value)

        recipe.ingredients.clear()
        db.flush()
        for name, quantity in definition.ingredients:
            recipe.ingredients.append(
                RecipeIngredient(
                    ingredient_item_id=items[name].id,
                    quantity=quantity,
                    unit=items[name].default_unit,
                )
            )
    db.commit()
    return created, updated


def main() -> None:
    db = SessionLocal()
    try:
        added = seed_exercises(db)
        total = len(
            db.scalars(select(Exercise).where(Exercise.created_by_user_id.is_(None))).all()
        )
        print(f"Seeded {added} new global exercise(s); {total} in the global catalog.")

        new_items = seed_ingredients(db)
        print(f"Seeded {new_items} new ingredient(s); {len(INGREDIENTS)} in the catalog.")

        created, updated = seed_recipes(db)
        print(f"Recipes: {created} created, {updated} updated ({len(RECIPES)} total).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
