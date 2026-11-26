import type { Equipment } from './exercise'
import type { Observation, SessionExerciseStatus, SetStatus, SetType } from './workout'

export type Trend = 'PROGRESSING' | 'STABLE' | 'REGRESSING' | 'INCOMPLETE' | 'INSUFFICIENT_DATA'
export type Suggestion =
  | 'INCREASE_LOAD'
  | 'ADD_REPS'
  | 'CONFIRM_TOP'
  | 'REVIEW_RIR'
  | 'REVIEW_PERFORMANCE'
  | 'HOLD_PAIN'
  | 'NONE'
export type GroupBy = 'SESSION' | 'WEEK' | 'PHASE'

export interface Analysis {
  trend: Trend
  trendDetail: string
  suggestion: Suggestion
  message: string | null
  suggestedLoadKg: number | null
  latestSummary: string | null
  previousSummary: string | null
  painReported: boolean
}

export interface ProgressionRule {
  exerciseId: string
  custom: boolean
  minRir: number | null
  sessionsAtTop: number
  loadIncrementKg: number | null
  effectiveIncrementKg: number
  enabled: boolean
}

export interface RuleRequest {
  minRir: number | null
  sessionsAtTop: number
  loadIncrementKg: number | null
  enabled: boolean
}

export interface ExerciseHistoryItem {
  sessionId: string
  performedAt: string
  dayName: string | null
  phaseName: string | null
  weekNumber: number | null
  deload: boolean
  status: SessionExerciseStatus
  complete: boolean
  plannedSets: number | null
  repsMin: number | null
  repsMax: number | null
  summary: string
  topLoadKg: number | null
  validSets: number
  totalReps: number
  volumeKg: number
  painReported: boolean
  sets: {
    setType: SetType
    status: SetStatus
    loadKg: number | null
    reps: number | null
    rir: number | null
  }[]
}

export interface ExerciseSummary {
  exerciseId: string
  exerciseName: string
  equipment: Equipment
  executions: number
  lastPerformedAt: string | null
  lastSummary: string | null
  lastTopLoadKg: number | null
  lastReps: number[]
  bestSet: { loadKg: number; reps: number; performedAt: string } | null
  bestEstimatedOneRepMaxKg: number | null
  bestEstimatedOneRepMaxAt: string | null
  analysis: Analysis
  rule: ProgressionRule
  observations: Observation[]
}

export interface ProgressPoint {
  label: string
  date: string
  executions: number
  topLoadKg: number
  repsAtTopLoad: number | null
  validSets: number
  totalReps: number
  volumeKg: number
  bestEstimatedOneRepMaxKg: number | null
}

export interface ProgressionItem {
  exerciseId: string
  exerciseName: string
  equipment: Equipment
  muscleGroup: string
  executions: number
  lastPerformedAt: string
  analysis: Analysis
}

export interface ProgressionReport {
  phaseId: string | null
  phaseName: string | null
  from: string | null
  to: string | null
  counts: Record<Trend, number>
  items: ProgressionItem[]
}

export interface MuscleVolume {
  muscleGroup: string
  sets: number
  secondarySets: number
}

export interface VolumeReport {
  from: string
  to: string
  weeks: {
    weekStart: string
    sessions: number
    validSets: number
    volumeKg: number
    muscles: MuscleVolume[]
  }[]
  totals: MuscleVolume[]
}
