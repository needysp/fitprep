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
