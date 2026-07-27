export type UserRole = 'admin' | 'user'
export type DietGoal = 'lean_bulk' | 'bulk' | 'cut' | 'custom'

export interface User {
  id: number
  email: string
  display_name: string
  role: UserRole
}

export interface Profile {
  height_cm: number
  gender: string
  training_goal: string
  diet_goal: DietGoal
  diet_custom_text: string
}

export interface Me {
  user: User
  profile: Profile | null
}

export interface AllowedEmail {
  id: number
  email: string
  role: UserRole
  note: string
  created_at: string
  registered: boolean
}

export interface AdminUser {
  id: number
  email: string
  display_name: string
  role: UserRole
  created_at: string
}

// --- Training ---

export interface Exercise {
  id: number
  name: string
  muscle_group: string
  guide_url: string
  target_muscles: string
  target_muscles_image_url: string
  execution: string
  execution_image_url: string
  created_by_user_id: number | null
  is_global: boolean
  can_edit: boolean
}

/** Editable fields of an exercise (create + update share this shape). */
export interface ExerciseInput {
  name: string
  muscle_group: string
  guide_url: string
  target_muscles: string
  target_muscles_image_url: string
  execution: string
  execution_image_url: string
}

export interface RoutineExercise {
  id: number
  exercise_id: number
  position: number
  target_sets: number | null
  target_reps: string | null
  exercise: Exercise
}

export interface Routine {
  id: number
  name: string
  description: string
  exercises: RoutineExercise[]
}

export interface WorkoutSet {
  id: number
  set_number: number
  weight_kg: number
  reps: number
}

export interface ExerciseLog {
  id: number
  exercise_id: number
  notes: string
  exercise: Exercise
  sets: WorkoutSet[]
}

export interface SessionSummary {
  id: number
  date: string
  notes: string
  routine_id: number | null
  routine_name: string | null
  started_at: string | null
  finished_at: string | null
  duration_minutes: number | null
  total_volume_kg: number
  total_sets: number
}

export interface SessionDetail extends SessionSummary {
  logs: ExerciseLog[]
}

export interface PrefillSet {
  set_number: number
  weight_kg: number
  reps: number
}

export interface Prefill {
  exercise_id: number
  last_session_date: string | null
  notes: string
  sets: PrefillSet[]
}

export interface PersonalRecord {
  weight_kg: number
  reps: number
  date: string
  estimated_1rm: number
}

export interface ExerciseHistoryPoint {
  date: string
  session_id: number
  best_weight_kg: number
  best_reps: number
  total_volume_kg: number
  sets: WorkoutSet[]
  notes: string
}

export interface ExerciseHistory {
  exercise: Exercise
  best_weight: PersonalRecord | null
  best_estimated_1rm: PersonalRecord | null
  points: ExerciseHistoryPoint[]
}

export interface BodyweightEntry {
  id: number
  date: string
  weight_kg: number
}

// --- Recipes ---

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type IngredientCategory =
  | 'produce'
  | 'protein'
  | 'dairy'
  | 'pantry'
  | 'frozen'
  | 'other'

export interface Recipe {
  id: number
  title: string
  meal_type: MealType
  servings: number
  prep_minutes: number
  tags: string[]
  image_url: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  created_by_user_id: number | null
  is_global: boolean
  can_edit: boolean
}

export interface IngredientItem {
  id: number
  name: string
  category: IngredientCategory
  default_unit: string
  kcal_per_100: number
  protein_per_100: number
  carbs_per_100: number
  fat_per_100: number
  grams_per_unit: number
}

export interface RecipeIngredient {
  ingredient_item_id: number
  name: string
  category: IngredientCategory
  quantity: number
  unit: string
}

export interface RecipeDetail extends Recipe {
  instructions: string
  ingredients: RecipeIngredient[]
}

// --- Meal plan + shopping list ---

export interface MealPlanItem {
  id: number
  day_of_week: number
  meal_type: MealType
  recipe_id: number
  recipe_title: string
  servings: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface DayTotals {
  day_of_week: number
  date: string
  meals: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface MealPlan {
  week_start: string
  items: MealPlanItem[]
  days: DayTotals[]
  average_calories: number
  average_protein_g: number
}

export interface ShoppingItem {
  ingredient_item_id: number
  name: string
  category: IngredientCategory
  quantity: number
  unit: string
  checked: boolean
  used_in: string[]
}

export interface ShoppingList {
  week_start: string
  groups: { category: IngredientCategory; items: ShoppingItem[] }[]
  total_items: number
  checked_items: number
}
