/**
 * The rough muscle groups exercises are filed under — these are the section
 * headers in the exercise picker, and the options offered when creating or
 * editing an exercise. Values are lowercase to match the seeded catalog.
 */
// Listed alphabetically to match the section order in the exercise picker.
export const MUSCLE_GROUPS = [
  { value: 'arms', label: 'Arms' },
  { value: 'back', label: 'Back' },
  { value: 'chest', label: 'Chest' },
  { value: 'core', label: 'Core' },
  { value: 'legs', label: 'Legs' },
  { value: 'shoulders', label: 'Shoulders' },
] as const

/** Meal types, in the order they're eaten — used for the recipe tabs. */
export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snacks' },
] as const

/** Weekday labels, Monday-first to match day_of_week 0-6. */
export const WEEKDAYS = [
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
  { short: 'Sun', long: 'Sunday' },
] as const

/** Supermarket departments, in a sensible walking order for the shopping list. */
export const INGREDIENT_CATEGORIES = [
  { value: 'produce', label: 'Produce' },
  { value: 'protein', label: 'Protein' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'other', label: 'Other' },
] as const
