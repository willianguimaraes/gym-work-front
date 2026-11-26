import type { Equipment } from './exercise'
import type { DayOfWeek } from './training'

export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED'
export type SessionExerciseStatus = 'PENDING' | 'PARTIAL' | 'DONE' | 'SKIPPED' | 'SUBSTITUTED'
export type SetType = 'WARMUP' | 'ACTIVATION' | 'WORKING' | 'DROP_SET' | 'REST_PAUSE' | 'EXTRA'
export type SetStatus = 'COMPLETED' | 'NOT_PERFORMED' | 'INTERRUPTED' | 'SUBSTITUTED'
export type ObservationCategory =
  | 'PAIN'
  | 'DISCOMFORT'
  | 'RECOVERY'
  | 'SLEEP'
  | 'ENERGY'
  | 'EXECUTION_DIFFICULTY'
  | 'EQUIPMENT_UNAVAILABLE'
  | 'GENERAL'
export type BodyRegion =
  | 'NECK'
  | 'SHOULDER'
  | 'UPPER_BACK'
  | 'LOWER_BACK'
  | 'CHEST'
  | 'ELBOW'
  | 'WRIST'
  | 'HAND'
  | 'ABDOMEN'
  | 'HIP'
  | 'GLUTE'
  | 'THIGH'
  | 'KNEE'
  | 'CALF'
  | 'ANKLE'
  | 'FOOT'
  | 'OTHER'
export type BodySide = 'LEFT' | 'RIGHT' | 'BOTH'
export type ObservationMoment = 'BEFORE' | 'DURING' | 'AFTER'

export interface WorkoutSet {
  id: string
  sessionExerciseId: string
  clientId: string | null
  setNumber: number
  setType: SetType
  parentSetId: string | null
  status: SetStatus
  /** Sempre em kg. */
  loadKg: number | null
  reps: number | null
  rir: number | null
  restSeconds: number | null
  notes: string | null
  performedAt: string
  /** Só no app: série guardada na fila local, ainda não confirmada pela API. */
  pending?: boolean
}

export interface SetRequest {
  clientId?: string | null
  setType: SetType
  status: SetStatus
  loadKg: number | null
  reps: number | null
  rir: number | null
  restSeconds: number | null
  notes: string | null
  parentSetId: string | null
}

export interface LastExecution {
  sessionId: string
  performedAt: string
  sets: { setType: SetType; loadKg: number | null; reps: number | null; rir: number | null }[]
}

export interface SessionExercise {
  id: string
  position: number
  exerciseId: string
  exerciseName: string
  equipment: Equipment
  muscleGroup: string
  plannedExerciseId: string | null
  status: SessionExerciseStatus
  substitutedById: string | null
  notes: string | null
  plannedSets: number | null
  repsMin: number | null
  repsMax: number | null
  restSeconds: number | null
  targetRir: number | null
  referenceLoadKg: number | null
  sets: WorkoutSet[]
  lastExecution: LastExecution | null
}

export interface Observation {
  id: string
  category: ObservationCategory
  sessionId: string | null
  sessionExerciseId: string | null
  exerciseId: string | null
  bodyRegion: BodyRegion | null
  bodySide: BodySide | null
  intensity: number | null
  moment: ObservationMoment | null
  interrupted: boolean
  text: string | null
  observedAt: string
}

export interface ObservationRequest {
  category: ObservationCategory
  sessionId?: string | null
  sessionExerciseId?: string | null
  exerciseId?: string | null
  bodyRegion: BodyRegion | null
  bodySide: BodySide | null
  intensity: number | null
  moment: ObservationMoment | null
  interrupted: boolean
  text: string | null
}

export interface Session {
  id: string
  status: SessionStatus
  startedAt: string
  finishedAt: string | null
  notes: string | null
  planId: string | null
  phaseId: string | null
  weekId: string | null
  workoutDayId: string | null
  planName: string | null
  phaseName: string | null
  weekNumber: number | null
  deloadWeek: boolean
  dayName: string | null
  plannedSets: number
  completedSets: number
  exercises: SessionExercise[]
  observations: Observation[]
}

export interface SessionSummary {
  id: string
  status: SessionStatus
  startedAt: string
  finishedAt: string | null
  planName: string | null
  phaseName: string | null
  weekNumber: number | null
  dayName: string | null
  exercisesCount: number
  completedSets: number
}

export interface StartOptions {
  current: SessionSummary | null
  today: string
  plan: { id: string; name: string } | null
  phases: {
    id: string
    name: string
    position: number
    startDate: string | null
    endDate: string | null
    weeksCount: number
  }[]
  phase: { id: string; name: string; startDate: string | null; endDate: string | null } | null
  week: { id: string; weekNumber: number; startDate: string | null; deload: boolean } | null
  days: {
    id: string
    name: string
    dayOfWeek: DayOfWeek | null
    exercisesCount: number
    lastPerformedAt: string | null
  }[]
}
