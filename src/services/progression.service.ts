import { api } from './api'
import type { Page } from '@/types/exercise'
import type {
  ExerciseHistoryItem,
  ExerciseSummary,
  GroupBy,
  ProgressionReport,
  ProgressionRule,
  ProgressPoint,
  RuleRequest,
  VolumeReport,
} from '@/types/progression'

/** Evolução por exercício, análise de progressão e volume. */
export const progressionService = {
  async summary(exerciseId: string): Promise<ExerciseSummary> {
    const { data } = await api.get<ExerciseSummary>(`/api/exercises/${exerciseId}/summary`)
    return data
  },
  async history(exerciseId: string, page = 0, size = 10): Promise<Page<ExerciseHistoryItem>> {
    const { data } = await api.get<Page<ExerciseHistoryItem>>(
      `/api/exercises/${exerciseId}/history`,
      { params: { page, size } },
    )
    return data
  },
  async progress(exerciseId: string, groupBy: GroupBy): Promise<ProgressPoint[]> {
    const { data } = await api.get<ProgressPoint[]>(`/api/exercises/${exerciseId}/progress`, {
      params: { groupBy },
    })
    return data
  },
  async updateRule(exerciseId: string, payload: RuleRequest): Promise<ProgressionRule> {
    const { data } = await api.put<ProgressionRule>(
      `/api/exercises/${exerciseId}/progression-rule`,
      payload,
    )
    return data
  },
  async resetRule(exerciseId: string): Promise<ProgressionRule> {
    const { data } = await api.delete<ProgressionRule>(
      `/api/exercises/${exerciseId}/progression-rule`,
    )
    return data
  },
  async report(params: { phaseId?: string | null; weeks?: number }): Promise<ProgressionReport> {
    const { data } = await api.get<ProgressionReport>('/api/progression', {
      params: params.phaseId ? { phaseId: params.phaseId } : { weeks: params.weeks ?? 8 },
    })
    return data
  },
  async volume(weeks = 8): Promise<VolumeReport> {
    const { data } = await api.get<VolumeReport>('/api/progression/volume', { params: { weeks } })
    return data
  },
}
