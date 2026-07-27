"""Weekly meal plan and the shopping list derived from it.

Nothing about the shopping list is stored: it is recomputed each request by
aggregating the ingredients of every recipe planned that week, scaled to the
number of servings actually planned, then overlaid with the user's check marks.
"""

from collections import defaultdict
from datetime import date as date_type
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    IngredientCategory,
    MealPlanItem,
    Recipe,
    RecipeIngredient,
    ShoppingCheck,
    User,
)
from ..schemas import (
    DayTotals,
    MealPlanItemIn,
    MealPlanItemOut,
    MealPlanOut,
    ShoppingCheckIn,
    ShoppingGroupOut,
    ShoppingItemOut,
    ShoppingListOut,
)

router = APIRouter(tags=["mealplan"])

# Display order for the shopping list: roughly how a supermarket is walked.
CATEGORY_ORDER = [
    IngredientCategory.produce,
    IngredientCategory.protein,
    IngredientCategory.dairy,
    IngredientCategory.pantry,
    IngredientCategory.frozen,
    IngredientCategory.other,
]

def validated_week(week_start: date_type = Query(...)) -> date_type:
    """Weeks always start on the ISO Monday, so clients can't disagree."""
    if week_start.weekday() != 0:
        raise HTTPException(
            status_code=422,
            detail="week_start must be a Monday (ISO week start)",
        )
    return week_start


def _plan_items(db: Session, user: User, week_start: date_type) -> list[MealPlanItem]:
    return list(
        db.scalars(
            select(MealPlanItem)
            .where(
                MealPlanItem.user_id == user.id,
                MealPlanItem.week_start == week_start,
            )
            .order_by(MealPlanItem.day_of_week, MealPlanItem.id)
            .options(selectinload(MealPlanItem.recipe))
        )
    )


def _build_plan(db: Session, user: User, week_start: date_type) -> MealPlanOut:
    items = _plan_items(db, user, week_start)

    out_items = [
        MealPlanItemOut(
            id=item.id,
            day_of_week=item.day_of_week,
            meal_type=item.meal_type,
            recipe_id=item.recipe_id,
            recipe_title=item.recipe.title,
            servings=item.recipe.servings,
            calories=item.recipe.calories,
            protein_g=item.recipe.protein_g,
            carbs_g=item.recipe.carbs_g,
            fat_g=item.recipe.fat_g,
        )
        for item in items
    ]

    # One planned item = one serving eaten, so a day's macros are the sum of the
    # per-serving macros of its items.
    days: list[DayTotals] = []
    for day in range(7):
        todays = [i for i in items if i.day_of_week == day]
        days.append(
            DayTotals(
                day_of_week=day,
                date=week_start + timedelta(days=day),
                meals=len(todays),
                calories=round(sum(i.recipe.calories for i in todays), 1),
                protein_g=round(sum(i.recipe.protein_g for i in todays), 1),
                carbs_g=round(sum(i.recipe.carbs_g for i in todays), 1),
                fat_g=round(sum(i.recipe.fat_g for i in todays), 1),
            )
        )

    planned_days = [d for d in days if d.meals > 0]
    divisor = len(planned_days) or 1
    return MealPlanOut(
        week_start=week_start,
        items=out_items,
        days=days,
        average_calories=round(sum(d.calories for d in planned_days) / divisor, 1),
        average_protein_g=round(sum(d.protein_g for d in planned_days) / divisor, 1),
    )


@router.get("/api/mealplan", response_model=MealPlanOut)
def get_mealplan(
    week_start: date_type = Depends(validated_week),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _build_plan(db, user, week_start)


@router.post("/api/mealplan", response_model=MealPlanOut, status_code=201)
def add_meal(
    data: MealPlanItemIn,
    week_start: date_type = Depends(validated_week),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipe = db.get(Recipe, data.recipe_id)
    if recipe is None or (
        recipe.created_by_user_id is not None and recipe.created_by_user_id != user.id
    ):
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Every slot can hold several recipes — a breakfast is often muesli *and* a
    # shake — and the same recipe twice simply means two servings.
    db.add(
        MealPlanItem(
            user_id=user.id,
            week_start=week_start,
            day_of_week=data.day_of_week,
            meal_type=data.meal_type,
            recipe_id=recipe.id,
        )
    )
    db.commit()
    return _build_plan(db, user, week_start)


@router.delete("/api/mealplan/{item_id}", status_code=204)
def remove_meal(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(MealPlanItem).where(
            MealPlanItem.id == item_id, MealPlanItem.user_id == user.id
        )
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Meal not found")
    db.delete(item)
    db.commit()


def _round_quantity(value: float, unit: str) -> float:
    """Whole grams/millilitres read better on a shopping list than decimals."""
    if unit in ("g", "ml"):
        return round(value) if value >= 10 else round(value, 1)
    return round(value, 2)


@router.get("/api/shopping-list", response_model=ShoppingListOut)
def shopping_list(
    week_start: date_type = Depends(validated_week),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = _plan_items(db, user, week_start)

    # How many servings of each recipe are planned this week.
    servings_planned: dict[int, int] = defaultdict(int)
    for item in items:
        servings_planned[item.recipe_id] += 1

    if servings_planned:
        recipes = db.scalars(
            select(Recipe)
            .where(Recipe.id.in_(servings_planned))
            .options(
                selectinload(Recipe.ingredients).selectinload(RecipeIngredient.item)
            )
        ).all()
    else:
        recipes = []

    # Aggregate by (ingredient, unit): a recipe that makes 4 servings but is
    # eaten twice needs half its ingredients.
    totals: dict[tuple[int, str], float] = defaultdict(float)
    meta: dict[tuple[int, str], tuple[str, IngredientCategory]] = {}
    used_in: dict[tuple[int, str], list[str]] = defaultdict(list)

    for recipe in recipes:
        factor = servings_planned[recipe.id] / max(1, recipe.servings)
        for ri in recipe.ingredients:
            key = (ri.ingredient_item_id, ri.unit)
            totals[key] += ri.quantity * factor
            meta[key] = (ri.item.name, ri.item.category)
            if recipe.title not in used_in[key]:
                used_in[key].append(recipe.title)

    checks = {
        check.ingredient_item_id: check.checked
        for check in db.scalars(
            select(ShoppingCheck).where(
                ShoppingCheck.user_id == user.id,
                ShoppingCheck.week_start == week_start,
            )
        )
    }

    by_category: dict[IngredientCategory, list[ShoppingItemOut]] = defaultdict(list)
    for (item_id, unit), quantity in totals.items():
        name, category = meta[(item_id, unit)]
        by_category[category].append(
            ShoppingItemOut(
                ingredient_item_id=item_id,
                name=name,
                category=category,
                quantity=_round_quantity(quantity, unit),
                unit=unit,
                checked=checks.get(item_id, False),
                used_in=sorted(used_in[(item_id, unit)]),
            )
        )

    groups = [
        ShoppingGroupOut(category=category, items=sorted(entries, key=lambda i: i.name))
        for category in CATEGORY_ORDER
        if (entries := by_category.get(category))
    ]
    all_items = [i for g in groups for i in g.items]
    return ShoppingListOut(
        week_start=week_start,
        groups=groups,
        total_items=len(all_items),
        checked_items=sum(1 for i in all_items if i.checked),
    )


@router.put("/api/shopping-list/check", status_code=204)
def set_check(
    data: ShoppingCheckIn,
    week_start: date_type = Depends(validated_week),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(ShoppingCheck).where(
            ShoppingCheck.user_id == user.id,
            ShoppingCheck.week_start == week_start,
            ShoppingCheck.ingredient_item_id == data.ingredient_item_id,
        )
    )
    if existing is None:
        db.add(
            ShoppingCheck(
                user_id=user.id,
                week_start=week_start,
                ingredient_item_id=data.ingredient_item_id,
                checked=data.checked,
            )
        )
    else:
        existing.checked = data.checked
    db.commit()


@router.post("/api/shopping-list/clear", status_code=204)
def clear_checks(
    week_start: date_type = Depends(validated_week),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.execute(
        delete(ShoppingCheck).where(
            ShoppingCheck.user_id == user.id, ShoppingCheck.week_start == week_start
        )
    )
    db.commit()
