import type { Equipment } from './exercise'

export type PlanGoal = 'HYPERTROPHY' | 'STRENGTH' | 'FAT_LOSS' | 'MAINTENANCE' | 'OTHER'
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
export type DayOfWeek =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface PlanSummary {
  id: string
  name: string
  goal: PlanGoal
  status: PlanStatus
  startDate: string | null
  expectedEndDate: string | null
  phasesCount: number
  totalWeeks: number
  updatedAt: string
}

export interface PhaseSummary {
  id: string
  name: string
  position: number
  startDate: string | null
  endDate: string | null
  weeksCount: number
  daysCount: number
}

export interface Plan {
  id: string
  name: string
  goal: PlanGoal
  status: PlanStatus
  startDate: string | null
  expectedEndDate: string | null
  notes: string | null
  totalWeeks: number
  phases: PhaseSummary[]
  updatedAt: string
}

export interface PlanRequest {
  name: string
  goal: PlanGoal
  startDate: string | null
  expectedEndDate: string | null
  status?: PlanStatus | null
  notes: string | null
}

export interface Week {
  id: string
  weekNumber: number
  startDate: string | null
  deload: boolean
  notes: string | null
}

export interface ExerciseRef {
  id: string
  name: string
  primaryMuscleGroup: string
  equipment: Equipment
  active: boolean
}

export interface PlannedExercise {
  id: string
  position: number
  exercise: ExerciseRef
  sets: number
  repsMin: number
  repsMax: number
  restSeconds: number | null
  /** Sempre em kg. */
  suggestedLoadKg: number | null
  targetRir: number | null
  notes: string | null
}

export interface PlannedExerciseRequest {
  exerciseId?: string
  sets: number
  repsMin: number
  repsMax: number
  restSeconds: number | null
  suggestedLoadKg: number | null
  targetRir: number | null
  notes: string | null
}

export interface WorkoutDay {
  id: string
  planId: string
  phaseId: string
  phaseName: string
  name: string
  dayOfWeek: DayOfWeek | null
  position: number
  notes: string | null
  exercises: PlannedExercise[]
}

export interface DayRequest {
  name: string
  dayOfWeek: DayOfWeek | null
  notes: string | null
}

export interface Phase {
  id: string
  planId: string
  planName: string
  name: string
  position: number
  startDate: string | null
  endDate: string | null
  weeksCount: number
  notes: string | null
  weeks: Week[]
  days: WorkoutDay[]
}

export interface PhaseRequest {
  name: string
  startDate: string | null
  weeksCount: number
  notes: string | null
}
