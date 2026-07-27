"""ORM models.

All user data is scoped by user_id. Exercise, IngredientItem and Recipe are
global seeded catalogs shared by all users. Derived values (shopping list,
daily macro totals, PRs, prefill, session duration/volume) are computed from
these tables, never stored.

Access is gated: only emails on the admin-managed AllowedEmail list (plus the
config ADMIN_EMAILS bootstrap admins) may sign in.
"""

import enum
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class DietGoal(str, enum.Enum):
    lean_bulk = "lean_bulk"
    bulk = "bulk"
    cut = "cut"
    custom = "custom"


class MealType(str, enum.Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"


class IngredientCategory(str, enum.Enum):
    produce = "produce"
    protein = "protein"
    dairy = "dairy"
    pantry = "pantry"
    frozen = "frozen"
    other = "other"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    oidc_sub: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    display_name: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=16),
        default=UserRole.user,
        server_default=UserRole.user.value,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    profile: Mapped["UserProfile | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class UserProfile(Base):
    """Created during onboarding; its presence marks onboarding as complete.

    No weight column on purpose: current weight is the latest BodyweightEntry
    (onboarding creates the first one).
    """

    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    height_cm: Mapped[float] = mapped_column(Float)
    gender: Mapped[str] = mapped_column(String(32), default="")
    training_goal: Mapped[str] = mapped_column(Text, default="")
    diet_goal: Mapped[DietGoal] = mapped_column(Enum(DietGoal, native_enum=False, length=32))
    diet_custom_text: Mapped[str] = mapped_column(Text, default="")

    user: Mapped[User] = relationship(back_populates="profile")


class AllowedEmail(Base):
    """Admin-managed login allowlist.

    Only emails listed here (plus config ADMIN_EMAILS) may sign in. The row's
    role is what the user is granted on login, and it re-syncs on every login so
    this list is the source of truth for access and roles.
    """

    __tablename__ = "allowed_emails"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False, length=16),
        default=UserRole.user,
        server_default=UserRole.user.value,
    )
    note: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Exercise(Base):
    """An exercise, either global or private to one user.

    created_by_user_id NULL = global catalog (seeded / admin-managed, visible to
    everyone); set = a private exercise only its creator sees, so a user can add
    whatever their gym has without polluting the shared catalog.

    guide_url links out to a guide; the target_muscles / execution fields hold
    the user's own how-to notes (shown in an overlay while training), each with
    an optional image URL.
    """

    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    muscle_group: Mapped[str] = mapped_column(String(64), default="")
    guide_url: Mapped[str] = mapped_column(String(512), default="")
    # How-to reference, shown in the info overlay during a workout.
    target_muscles: Mapped[str] = mapped_column(Text, default="")
    target_muscles_image_url: Mapped[str] = mapped_column(String(1024), default="")
    execution: Mapped[str] = mapped_column(Text, default="")  # Haltung & Ausführung
    execution_image_url: Mapped[str] = mapped_column(String(1024), default="")
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )


class Routine(Base):
    """Reusable training-plan template (e.g. Push/Pull/Legs day)."""

    __tablename__ = "routines"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")

    exercises: Mapped[list["RoutineExercise"]] = relationship(
        back_populates="routine",
        cascade="all, delete-orphan",
        order_by="RoutineExercise.position",
    )


class RoutineExercise(Base):
    __tablename__ = "routine_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    routine_id: Mapped[int] = mapped_column(ForeignKey("routines.id", ondelete="CASCADE"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer, default=0)
    target_sets: Mapped[int | None] = mapped_column(Integer)
    target_reps: Mapped[str | None] = mapped_column(String(32))  # e.g. "8-12"

    routine: Mapped[Routine] = relationship(back_populates="exercises")
    exercise: Mapped[Exercise] = relationship()


class WorkoutSession(Base):
    """One training day. Duration derives from the timestamps, volume from the sets."""

    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    routine_id: Mapped[int | None] = mapped_column(ForeignKey("routines.id", ondelete="SET NULL"))
    date: Mapped[date] = mapped_column(Date, index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)

    routine: Mapped[Routine | None] = relationship()
    logs: Mapped[list["ExerciseLog"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class ExerciseLog(Base):
    """One exercise performed on one training day, with that day's notes."""

    __tablename__ = "exercise_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("workout_sessions.id", ondelete="CASCADE"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"), index=True)
    notes: Mapped[str] = mapped_column(Text, default="")

    session: Mapped[WorkoutSession] = relationship(back_populates="logs")
    exercise: Mapped[Exercise] = relationship()
    sets: Mapped[list["WorkoutSet"]] = relationship(
        back_populates="log", cascade="all, delete-orphan", order_by="WorkoutSet.set_number"
    )


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_log_id: Mapped[int] = mapped_column(ForeignKey("exercise_logs.id", ondelete="CASCADE"))
    set_number: Mapped[int] = mapped_column(Integer)
    weight_kg: Mapped[float] = mapped_column(Float)
    reps: Mapped[int] = mapped_column(Integer)

    log: Mapped[ExerciseLog] = relationship(back_populates="sets")


class BodyweightEntry(Base):
    __tablename__ = "bodyweight_entries"
    __table_args__ = (UniqueConstraint("user_id", "date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date)
    weight_kg: Mapped[float] = mapped_column(Float)


class IngredientItem(Base):
    """Canonical global ingredient catalog.

    Recipes reference these rows instead of free-text names so shopping-list
    aggregation is robust, the list can group by supermarket department, and a
    future StoreOffer table (weekly discounts) has a stable join point.

    Nutrition is per 100 g/ml and lives here so the server can compute macros for
    any recipe — seeded or user-written — from its actual quantities.
    """

    __tablename__ = "ingredient_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    category: Mapped[IngredientCategory] = mapped_column(
        Enum(IngredientCategory, native_enum=False, length=32),
        default=IngredientCategory.other,
    )
    default_unit: Mapped[str] = mapped_column(String(32), default="g")
    kcal_per_100: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    protein_per_100: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    carbs_per_100: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    fat_per_100: Mapped[float] = mapped_column(Float, default=0, server_default="0")
    # Weight of one `default_unit`: 1 for g/ml, the real weight for piece/slice.
    grams_per_unit: Mapped[float] = mapped_column(Float, default=1, server_default="1")


class Recipe(Base):
    """A recipe, either global or private to one user (same rule as Exercise).

    created_by_user_id NULL = shared catalog (seeded / admin-managed), set =
    private to that user. Macros are per serving and are computed from the
    ingredient quantities, never entered by hand.
    """

    __tablename__ = "recipes"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    meal_type: Mapped[MealType] = mapped_column(
        Enum(MealType, native_enum=False, length=32), index=True
    )
    servings: Mapped[int] = mapped_column(Integer, default=1)
    prep_minutes: Mapped[int] = mapped_column(Integer, default=0)
    instructions: Mapped[str] = mapped_column(Text, default="")
    calories: Mapped[float] = mapped_column(Float, default=0)
    protein_g: Mapped[float] = mapped_column(Float, default=0)
    carbs_g: Mapped[float] = mapped_column(Float, default=0)
    fat_g: Mapped[float] = mapped_column(Float, default=0)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    image_url: Mapped[str | None] = mapped_column(String(512))

    ingredients: Mapped[list["RecipeIngredient"]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan"
    )


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"))
    ingredient_item_id: Mapped[int] = mapped_column(
        ForeignKey("ingredient_items.id", ondelete="CASCADE")
    )
    quantity: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(32))

    recipe: Mapped[Recipe] = relationship(back_populates="ingredients")
    item: Mapped[IngredientItem] = relationship()


class MealPlanItem(Base):
    """One recipe planned for one day's meal slot of a week.

    week_start is always the ISO Monday (validated server-side); day_of_week is
    0-6 with 0 = Monday. One item = one serving eaten, so shopping quantities
    scale by planned_servings / recipe.servings. A slot may hold several recipes
    (muesli *and* a shake for breakfast), and the same recipe twice just means
    two servings.
    """

    __tablename__ = "meal_plan_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    week_start: Mapped[date] = mapped_column(Date, index=True)
    day_of_week: Mapped[int] = mapped_column(Integer)  # 0 = Monday … 6 = Sunday
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType, native_enum=False, length=32))
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"))

    recipe: Mapped[Recipe] = relationship()


class ShoppingCheck(Base):
    """Tap-to-check-off state overlaid on the derived weekly shopping list.

    Keyed by ingredient_item_id (not name strings) so recipe edits cannot
    orphan the state.
    """

    __tablename__ = "shopping_checks"
    __table_args__ = (UniqueConstraint("user_id", "week_start", "ingredient_item_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    week_start: Mapped[date] = mapped_column(Date)
    ingredient_item_id: Mapped[int] = mapped_column(
        ForeignKey("ingredient_items.id", ondelete="CASCADE")
    )
    checked: Mapped[bool] = mapped_column(Boolean, default=True)
