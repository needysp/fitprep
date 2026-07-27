from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from .models import DietGoal, IngredientCategory, MealType, UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str
    role: UserRole


class ProfileBase(BaseModel):
    height_cm: float = Field(gt=50, lt=300)
    gender: str = Field(default="", max_length=32)
    training_goal: str = ""
    diet_goal: DietGoal
    diet_custom_text: str = ""

    @model_validator(mode="after")
    def _custom_goal_needs_text(self):
        if self.diet_goal == DietGoal.custom and not self.diet_custom_text.strip():
            raise ValueError("diet_custom_text is required when diet_goal is 'custom'")
        return self


class ProfileCreate(ProfileBase):
    # Starting bodyweight: stored as the first BodyweightEntry, not on the profile.
    weight_kg: float = Field(gt=20, lt=500)


class ProfileUpdate(ProfileBase):
    pass


class ProfileOut(ProfileBase):
    model_config = ConfigDict(from_attributes=True)


class MeOut(BaseModel):
    user: UserOut
    profile: ProfileOut | None = None


# --- Admin: access control ---


class AllowedEmailCreate(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.user
    note: str = Field(default="", max_length=255)


class AllowedEmailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: UserRole
    note: str
    created_at: datetime
    # True once someone has actually signed in with this email.
    registered: bool = False


class UserAdminOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str
    role: UserRole
    created_at: datetime


# --- Bodyweight ---


class BodyweightCreate(BaseModel):
    weight_kg: float = Field(gt=20, lt=500)
    date: date_type | None = None  # defaults to today


class BodyweightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_type
    weight_kg: float


# --- Exercises ---


class ExerciseBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    muscle_group: str = Field(default="", max_length=64)
    guide_url: str = Field(default="", max_length=512)
    # Own how-to reference, shown in the info overlay while training.
    target_muscles: str = ""
    target_muscles_image_url: str = Field(default="", max_length=1024)
    execution: str = ""  # Haltung & Ausführung
    execution_image_url: str = Field(default="", max_length=1024)


class ExerciseCreate(ExerciseBase):
    # Admins only: add straight to the shared catalog instead of a private one.
    is_global: bool = False


class ExerciseUpdate(ExerciseBase):
    pass


class ExerciseOut(ExerciseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by_user_id: int | None
    # Convenience for the UI: is this the shared catalog entry or mine?
    is_global: bool = False
    can_edit: bool = False


# --- Routines ---


class RoutineExerciseIn(BaseModel):
    exercise_id: int
    target_sets: int | None = Field(default=None, ge=1, le=20)
    target_reps: str | None = Field(default=None, max_length=32)


class RoutineExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    position: int
    target_sets: int | None
    target_reps: str | None
    exercise: ExerciseOut


class RoutineIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    # Ordered: list position becomes RoutineExercise.position
    exercises: list[RoutineExerciseIn] = []


class RoutineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    exercises: list[RoutineExerciseOut]


# --- Workouts ---


class SetIn(BaseModel):
    weight_kg: float = Field(ge=0, le=1000)
    reps: int = Field(ge=0, le=1000)


class SetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    set_number: int
    weight_kg: float
    reps: int


class ExerciseLogIn(BaseModel):
    exercise_id: int
    notes: str = ""


class ExerciseLogUpdate(BaseModel):
    notes: str = ""


class ExerciseLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    notes: str
    exercise: ExerciseOut
    sets: list[SetOut]


class SessionCreate(BaseModel):
    from_routine_id: int | None = None
    date: date_type | None = None  # defaults to today
    notes: str = ""


class SessionUpdate(BaseModel):
    notes: str = ""


class SessionSummaryOut(BaseModel):
    """List view: no nested sets, but the derived numbers the UI shows."""

    id: int
    date: date_type
    notes: str
    routine_id: int | None
    routine_name: str | None
    started_at: datetime | None
    finished_at: datetime | None
    duration_minutes: int | None
    total_volume_kg: float
    total_sets: int


class SessionDetailOut(SessionSummaryOut):
    logs: list[ExerciseLogOut]


class PersonalRecord(BaseModel):
    weight_kg: float
    reps: int
    date: date_type
    estimated_1rm: float


class ExerciseHistoryPoint(BaseModel):
    date: date_type
    session_id: int
    best_weight_kg: float
    best_reps: int
    total_volume_kg: float
    sets: list[SetOut]
    notes: str


class ExerciseHistoryOut(BaseModel):
    exercise: ExerciseOut
    best_weight: PersonalRecord | None
    best_estimated_1rm: PersonalRecord | None
    points: list[ExerciseHistoryPoint]


class PrefillSetOut(BaseModel):
    set_number: int
    weight_kg: float
    reps: int


class RecipeIngredientOut(BaseModel):
    ingredient_item_id: int
    name: str
    category: IngredientCategory
    quantity: float
    unit: str


class RecipeMacros(BaseModel):
    """Per serving."""

    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


class RecipeSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    meal_type: MealType
    servings: int
    prep_minutes: int
    tags: list[str]
    image_url: str | None
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    created_by_user_id: int | None = None
    is_global: bool = False
    can_edit: bool = False


class RecipeDetailOut(RecipeSummaryOut):
    instructions: str
    ingredients: list[RecipeIngredientOut]


class RecipeIngredientIn(BaseModel):
    ingredient_item_id: int
    quantity: float = Field(gt=0, le=100000)


class RecipeIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    meal_type: MealType
    servings: int = Field(default=1, ge=1, le=50)
    prep_minutes: int = Field(default=0, ge=0, le=1440)
    instructions: str = ""
    tags: list[str] = []
    image_url: str | None = Field(default=None, max_length=1024)
    ingredients: list[RecipeIngredientIn] = []
    # Admins only: publish to the shared catalog instead of keeping it private.
    is_global: bool = False


# --- Ingredient catalog ---


class IngredientItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: IngredientCategory = IngredientCategory.other
    default_unit: str = Field(default="g", max_length=32)
    kcal_per_100: float = Field(default=0, ge=0, le=1000)
    protein_per_100: float = Field(default=0, ge=0, le=100)
    carbs_per_100: float = Field(default=0, ge=0, le=100)
    fat_per_100: float = Field(default=0, ge=0, le=100)
    grams_per_unit: float = Field(default=1, gt=0, le=10000)


class IngredientItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: IngredientCategory
    default_unit: str
    kcal_per_100: float
    protein_per_100: float
    carbs_per_100: float
    fat_per_100: float
    grams_per_unit: float


class PrefillOut(BaseModel):
    """Last time this exercise was trained, to pre-populate the log form."""

    exercise_id: int
    last_session_date: date_type | None
    # Last session's notes, carried forward so they can be reviewed and updated.
    notes: str = ""
    sets: list[PrefillSetOut] = []
