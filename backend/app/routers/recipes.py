"""Recipe catalog.

Visibility mirrors the exercise catalog: everyone sees the seeded/shared recipes
(created_by_user_id IS NULL) plus their own. Admins curate the shared catalog;
any user can write private recipes.

Macros are always computed from the ingredients (see nutrition.py) — they are
never accepted from the client, so what the app shows matches what is in the dish.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    IngredientItem,
    MealPlanItem,
    MealType,
    Recipe,
    RecipeIngredient,
    User,
    UserRole,
)
from ..nutrition import compute_macros
from ..schemas import (
    IngredientItemIn,
    IngredientItemOut,
    RecipeDetailOut,
    RecipeIn,
    RecipeIngredientOut,
    RecipeSummaryOut,
)

router = APIRouter(prefix="/api/recipes", tags=["recipes"])
ingredients_router = APIRouter(prefix="/api/ingredients", tags=["ingredients"])


def _summary(recipe: Recipe, user: User) -> RecipeSummaryOut:
    is_global = recipe.created_by_user_id is None
    return RecipeSummaryOut(
        id=recipe.id,
        title=recipe.title,
        meal_type=recipe.meal_type,
        servings=recipe.servings,
        prep_minutes=recipe.prep_minutes,
        tags=recipe.tags,
        image_url=recipe.image_url,
        calories=recipe.calories,
        protein_g=recipe.protein_g,
        carbs_g=recipe.carbs_g,
        fat_g=recipe.fat_g,
        created_by_user_id=recipe.created_by_user_id,
        is_global=is_global,
        can_edit=(not is_global and recipe.created_by_user_id == user.id)
        or (is_global and user.role == UserRole.admin),
    )


def _detail(recipe: Recipe, user: User) -> RecipeDetailOut:
    return RecipeDetailOut(
        **_summary(recipe, user).model_dump(),
        instructions=recipe.instructions,
        ingredients=[
            RecipeIngredientOut(
                ingredient_item_id=ri.ingredient_item_id,
                name=ri.item.name,
                category=ri.item.category,
                quantity=ri.quantity,
                unit=ri.unit,
            )
            for ri in recipe.ingredients
        ],
    )


def _visible_or_404(recipe_id: int, user: User, db: Session) -> Recipe:
    recipe = db.scalar(
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(selectinload(Recipe.ingredients).selectinload(RecipeIngredient.item))
    )
    if recipe is None or (
        recipe.created_by_user_id is not None and recipe.created_by_user_id != user.id
    ):
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


def _assert_editable(recipe: Recipe, user: User) -> None:
    if recipe.created_by_user_id is None and user.role != UserRole.admin:
        raise HTTPException(
            status_code=403, detail="Only admins can change shared recipes"
        )


def _apply(recipe: Recipe, data: RecipeIn, db: Session) -> None:
    """Write the editable fields and recompute macros from the ingredients."""
    recipe.title = data.title.strip()
    recipe.meal_type = data.meal_type
    recipe.servings = data.servings
    recipe.prep_minutes = data.prep_minutes
    recipe.instructions = data.instructions
    recipe.tags = [tag.strip() for tag in data.tags if tag.strip()]
    recipe.image_url = (data.image_url or "").strip() or None

    items: list[tuple[IngredientItem, float]] = []
    for entry in data.ingredients:
        item = db.get(IngredientItem, entry.ingredient_item_id)
        if item is None:
            raise HTTPException(
                status_code=404, detail=f"Unknown ingredient {entry.ingredient_item_id}"
            )
        items.append((item, entry.quantity))

    recipe.ingredients.clear()
    db.flush()
    for item, quantity in items:
        recipe.ingredients.append(
            RecipeIngredient(
                ingredient_item_id=item.id,
                quantity=quantity,
                # Always the catalog unit, so the macro maths stays valid.
                unit=item.default_unit,
            )
        )

    for key, value in compute_macros(items, data.servings).items():
        setattr(recipe, key, value)


@router.get("", response_model=list[RecipeSummaryOut])
def list_recipes(
    meal_type: MealType | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Recipe).where(
        or_(Recipe.created_by_user_id.is_(None), Recipe.created_by_user_id == user.id)
    )
    if meal_type is not None:
        stmt = stmt.where(Recipe.meal_type == meal_type)
    recipes = db.scalars(stmt.order_by(Recipe.title)).all()
    return [_summary(r, user) for r in recipes]


@router.get("/{recipe_id}", response_model=RecipeDetailOut)
def get_recipe(
    recipe_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return _detail(_visible_or_404(recipe_id, user, db), user)


@router.post("", response_model=RecipeDetailOut, status_code=201)
def create_recipe(
    data: RecipeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.is_global and user.role != UserRole.admin:
        raise HTTPException(
            status_code=403, detail="Only admins can publish to the shared catalog"
        )
    recipe = Recipe(created_by_user_id=None if data.is_global else user.id)
    db.add(recipe)
    # _apply fills the columns and flushes once they are set.
    _apply(recipe, data, db)
    db.commit()
    return _detail(_visible_or_404(recipe.id, user, db), user)


@router.put("/{recipe_id}", response_model=RecipeDetailOut)
def update_recipe(
    recipe_id: int,
    data: RecipeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipe = _visible_or_404(recipe_id, user, db)
    _assert_editable(recipe, user)
    _apply(recipe, data, db)
    db.commit()
    return _detail(_visible_or_404(recipe_id, user, db), user)


@router.delete("/{recipe_id}", status_code=204)
def delete_recipe(
    recipe_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    recipe = _visible_or_404(recipe_id, user, db)
    _assert_editable(recipe, user)
    # Deleting would cascade the recipe out of any week it is planned into.
    if db.scalar(select(MealPlanItem).where(MealPlanItem.recipe_id == recipe_id)):
        raise HTTPException(
            status_code=409,
            detail="This recipe is used in a meal plan — remove it there first",
        )
    db.delete(recipe)
    db.commit()


@ingredients_router.get("", response_model=list[IngredientItemOut])
def list_ingredients(
    search: str | None = Query(default=None),
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(IngredientItem)
    if search:
        stmt = stmt.where(IngredientItem.name.ilike(f"%{search}%"))
    return db.scalars(stmt.order_by(IngredientItem.name)).all()


@ingredients_router.post("", response_model=IngredientItemOut, status_code=201)
def create_ingredient(
    data: IngredientItemIn,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Extend the shared ingredient vocabulary.

    Matching is case-insensitive so 'chicken breast' can't become a second entry
    next to 'Chicken breast' and split the shopping list in two.
    """
    name = data.name.strip()
    existing = db.scalar(
        select(IngredientItem).where(func.lower(IngredientItem.name) == name.lower())
    )
    if existing is not None:
        raise HTTPException(
            status_code=409, detail=f"'{existing.name}' is already in the catalog"
        )
    item = IngredientItem(**{**data.model_dump(), "name": name})
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
