import type { TrendPoint } from './assessment'
import type { MuscleVolume, Trend } from './progression'
import type { DayOfWeek, PlanGoal } from './training'
import type { Observation, SessionSummary } from './workout'

export interface DashboardExercise {
  exerciseId: string
  name: string
  executions: number
  latestSummary: string | null
  detail: string | null
}

export interface Dashboard {
  today: string
  plan: { id: string; name: string; goal: PlanGoal } | null
  phase: {
    id: string
    name: string
    startDate: string | null
    endDate: string | null
    weeksCount: number
    daysCount: number
  } | null
  week: { id: string; number: number; deload: boolean; startDate: string | null } | null
  next: {
    dayId: string
    name: string
    dayOfWeek: DayOfWeek | null
    exercisesCount: number
    lastPerformedAt: string | null
    reason: 'TODAY' | 'SCHEDULED' | 'ROTATION'
    date: string | null
  } | null
  current: SessionSummary | null
  recentSessions: SessionSummary[]
  body: {
    latestWeightKg: number | null
    latestWeightOn: string | null
    previousWeightKg: number | null
    previousWeightOn: string | null
    lastAssessmentId: string
    lastAssessmentOn: string
    trend: TrendPoint[]
  } | null
  frequency: {
    plannedPerWeek: number
    thisWeek: number
    weeks: { weekStart: string; sessions: number; validSets: number }[]
  }
  progression: {
    weeks: number
    counts: Record<Trend, number>
    progressing: DashboardExercise[]
    stable: DashboardExercise[]
    regressing: DashboardExercise[]
    mostFrequent: DashboardExercise[]
  }
  muscles: MuscleVolume[]
  recentObservations: Observation[]
}
