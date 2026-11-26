import type { Analysis } from './progression'

/** Abrangência do relatório, como aparece na URL do app. */
export type ReportScope = 'sessao' | 'semana' | 'fase'
export type ReportFormat = 'txt' | 'csv' | 'pdf'

export interface ExerciseChange {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  executionsInPeriod: number
  analysis: Analysis
  baselineSummary: string | null
  latestSummary: string | null
  loadFromKg: number | null
  loadToKg: number | null
  repsFrom: number[]
  repsTo: number[]
  loadChanged: boolean
  repsChanged: boolean
}

export interface AnalysisReport {
  scope: 'SESSION' | 'WEEK' | 'PHASE'
  title: string
  planName: string | null
  phaseName: string | null
  from: string | null
  to: string | null
  frequency: {
    completedSessions: number
    inProgressSessions: number
    plannedSessions: number | null
    missedDays: number
    weeks: number
    sessionsPerWeek: number | null
  }
  progressed: ExerciseChange[]
  maintained: ExerciseChange[]
  regressed: ExerciseChange[]
  inconclusive: ExerciseChange[]
  loadChanges: string[]
  repChanges: string[]
  notPerformed: { when: string; exercise: string | null; detail: string }[]
  observations: string[]
  discomforts: string[]
  volume: { muscleGroup: string; name: string; sets: number; secondarySets: number }[]
  validSets: number
  volumeKg: number
}

/** Arquivo baixado da API, com o nome sugerido pelo servidor. */
export interface DownloadedFile {
  blob: Blob
  filename: string
}
