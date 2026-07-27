"""Recipe catalog (global, seeded — read-only in v1)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import MealType, Recipe, RecipeIngredient, User
from ..schemas import RecipeDetailOut, RecipeIngredientOut, RecipeSummaryOut

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


@router.get("", response_model=list[RecipeSummaryOut])
def list_recipes(
    meal_type: MealType | None = Query(default=None),
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Recipe).order_by(Recipe.title)
    if meal_type is not None:
        stmt = stmt.where(Recipe.meal_type == meal_type)
    return db.scalars(stmt).all()


@router.get("/{recipe_id}", response_model=RecipeDetailOut)
def get_recipe(
    recipe_id: int,
    _user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipe = db.scalar(
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(selectinload(Recipe.ingredients).selectinload(RecipeIngredient.item))
    )
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")

    return RecipeDetailOut(
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
