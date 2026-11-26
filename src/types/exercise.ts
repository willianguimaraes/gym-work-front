export type ExerciseType = 'COMPOUND' | 'ISOLATION'
export type Equipment =
  | 'BARBELL'
  | 'DUMBBELL'
  | 'MACHINE'
  | 'CABLE'
  | 'SMITH'
  | 'BODYWEIGHT'
  | 'KETTLEBELL'
  | 'BAND'
  | 'OTHER'
export type ExerciseScope = 'ALL' | 'GLOBAL' | 'MINE'

export interface MuscleGroup {
  code: string
  name: string
}

export interface Exercise {
  id: string
  name: string
  /** Código do grupo muscular (ex.: CHEST). */
  primaryMuscleGroup: string
  secondaryMuscleGroups: string[]
  type: ExerciseType
  equipment: Equipment
  description: string | null
  instructions: string | null
  active: boolean
  /** Personalizado do usuário (editável). */
  custom: boolean
}

export interface ExerciseRequest {
  name: string
  primaryMuscleGroup: string
  secondaryMuscleGroups: string[]
  type: ExerciseType
  equipment: Equipment
  description: string | null
  instructions: string | null
}

export interface ExerciseSearch {
  search?: string
  muscleGroup?: string | null
  equipment?: Equipment | null
  scope?: ExerciseScope
  includeInactive?: boolean
  page?: number
  size?: number
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
