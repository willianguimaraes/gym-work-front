import { api } from './api'
import type { Exercise, ExerciseRequest, ExerciseSearch, MuscleGroup, Page } from '@/types/exercise'

export const exerciseService = {
  async muscleGroups(): Promise<MuscleGroup[]> {
    const { data } = await api.get<MuscleGroup[]>('/api/muscle-groups')
    return data
  },

  async search(params: ExerciseSearch): Promise<Page<Exercise>> {
    const query = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      ),
    )
    const { data } = await api.get<Page<Exercise>>('/api/exercises', { params: query })
    return data
  },

  async get(id: string): Promise<Exercise> {
    const { data } = await api.get<Exercise>(`/api/exercises/${id}`)
    return data
  },

  async create(payload: ExerciseRequest): Promise<Exercise> {
    const { data } = await api.post<Exercise>('/api/exercises', payload)
    return data
  },

  async update(id: string, payload: ExerciseRequest): Promise<Exercise> {
    const { data } = await api.put<Exercise>(`/api/exercises/${id}`, payload)
    return data
  },

  async setActive(id: string, active: boolean): Promise<Exercise> {
    const { data } = await api.patch<Exercise>(`/api/exercises/${id}/active`, { active })
    return data
  },
}
