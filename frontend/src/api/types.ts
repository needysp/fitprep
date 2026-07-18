export type DietGoal = 'lean_bulk' | 'bulk' | 'cut' | 'custom'

export interface User {
  id: number
  email: string
  display_name: string
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
