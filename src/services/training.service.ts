import { api } from './api'
import type {
  DayRequest,
  Phase,
  PhaseRequest,
  Plan,
  PlannedExercise,
  PlannedExerciseRequest,
  PlanRequest,
  PlanSummary,
  Week,
  WorkoutDay,
} from '@/types/training'

/** Planejamentos, fases, semanas, dias e exercícios planejados. */
export const trainingService = {
  // Planejamentos
  async listPlans(): Promise<PlanSummary[]> {
    const { data } = await api.get<PlanSummary[]>('/api/plans')
    return data
  },
  async getPlan(id: string): Promise<Plan> {
    const { data } = await api.get<Plan>(`/api/plans/${id}`)
    return data
  },
  async createPlan(payload: PlanRequest): Promise<Plan> {
    const { data } = await api.post<Plan>('/api/plans', payload)
    return data
  },
  async updatePlan(id: string, payload: PlanRequest): Promise<Plan> {
    const { data } = await api.put<Plan>(`/api/plans/${id}`, payload)
    return data
  },
  async deletePlan(id: string): Promise<void> {
    await api.delete(`/api/plans/${id}`)
  },
  async activatePlan(id: string): Promise<Plan> {
    const { data } = await api.post<Plan>(`/api/plans/${id}/activate`)
    return data
  },
  async duplicatePlan(id: string): Promise<Plan> {
    const { data } = await api.post<Plan>(`/api/plans/${id}/duplicate`)
    return data
  },

  // Fases e semanas
  async createPhase(planId: string, payload: PhaseRequest): Promise<Phase> {
    const { data } = await api.post<Phase>(`/api/plans/${planId}/phases`, payload)
    return data
  },
  async getPhase(id: string): Promise<Phase> {
    const { data } = await api.get<Phase>(`/api/phases/${id}`)
    return data
  },
  async updatePhase(id: string, payload: PhaseRequest): Promise<Phase> {
    const { data } = await api.put<Phase>(`/api/phases/${id}`, payload)
    return data
  },
  async deletePhase(id: string): Promise<void> {
    await api.delete(`/api/phases/${id}`)
  },
  async duplicatePhase(id: string): Promise<Phase> {
    const { data } = await api.post<Phase>(`/api/phases/${id}/duplicate`)
    return data
  },
  async updateWeek(id: string, payload: { deload: boolean; notes: string | null }): Promise<Week> {
    const { data } = await api.put<Week>(`/api/weeks/${id}`, payload)
    return data
  },

  // Dias de treino
  async createDay(phaseId: string, payload: DayRequest): Promise<WorkoutDay> {
    const { data } = await api.post<WorkoutDay>(`/api/phases/${phaseId}/days`, payload)
    return data
  },
  async reorderDays(phaseId: string, ids: string[]): Promise<Phase> {
    const { data } = await api.put<Phase>(`/api/phases/${phaseId}/days/order`, { ids })
    return data
  },
  async getDay(id: string): Promise<WorkoutDay> {
    const { data } = await api.get<WorkoutDay>(`/api/days/${id}`)
    return data
  },
  async updateDay(id: string, payload: DayRequest): Promise<WorkoutDay> {
    const { data } = await api.put<WorkoutDay>(`/api/days/${id}`, payload)
    return data
  },
  async deleteDay(id: string): Promise<void> {
    await api.delete(`/api/days/${id}`)
  },

  // Exercícios do dia
  async addExercise(dayId: string, payload: PlannedExerciseRequest): Promise<PlannedExercise> {
    const { data } = await api.post<PlannedExercise>(`/api/days/${dayId}/exercises`, payload)
    return data
  },
  async reorderExercises(dayId: string, ids: string[]): Promise<WorkoutDay> {
    const { data } = await api.put<WorkoutDay>(`/api/days/${dayId}/exercises/order`, { ids })
    return data
  },
  async updateExercise(id: string, payload: PlannedExerciseRequest): Promise<PlannedExercise> {
    const { data } = await api.put<PlannedExercise>(`/api/planned-exercises/${id}`, payload)
    return data
  },
  async removeExercise(id: string): Promise<void> {
    await api.delete(`/api/planned-exercises/${id}`)
  },
  async replaceExercise(id: string, exerciseId: string): Promise<PlannedExercise> {
    const { data } = await api.post<PlannedExercise>(`/api/planned-exercises/${id}/replace`, {
      exerciseId,
    })
    return data
  },
}
