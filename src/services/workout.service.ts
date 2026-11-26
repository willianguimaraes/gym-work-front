import { api } from './api'
import type { Page } from '@/types/exercise'
import type {
  Observation,
  ObservationRequest,
  Session,
  SessionExercise,
  SessionSummary,
  SetRequest,
  StartOptions,
} from '@/types/workout'

/** Execução do treino: sessões, séries e observações. */
export const workoutService = {
  async startOptions(phaseId?: string | null): Promise<StartOptions> {
    const { data } = await api.get<StartOptions>('/api/sessions/start-options', {
      params: phaseId ? { phaseId } : undefined,
    })
    return data
  },
  async start(workoutDayId: string | null, weekId?: string | null): Promise<Session> {
    const { data } = await api.post<Session>('/api/sessions', {
      workoutDayId,
      weekId: weekId ?? null,
    })
    return data
  },
  async current(): Promise<Session | null> {
    const response = await api.get<Session>('/api/sessions/current')
    return response.status === 204 ? null : response.data
  },
  async get(id: string): Promise<Session> {
    const { data } = await api.get<Session>(`/api/sessions/${id}`)
    return data
  },
  async history(page = 0, size = 20): Promise<Page<SessionSummary>> {
    const { data } = await api.get<Page<SessionSummary>>('/api/sessions', {
      params: { page, size },
    })
    return data
  },
  async finish(id: string, notes: string | null): Promise<Session> {
    const { data } = await api.post<Session>(`/api/sessions/${id}/finish`, { notes })
    return data
  },
  async updateNotes(id: string, notes: string | null): Promise<Session> {
    const { data } = await api.patch<Session>(`/api/sessions/${id}`, { notes })
    return data
  },
  async discard(id: string): Promise<void> {
    await api.delete(`/api/sessions/${id}`)
  },
  async addExercise(sessionId: string, exerciseId: string): Promise<SessionExercise> {
    const { data } = await api.post<SessionExercise>(`/api/sessions/${sessionId}/exercises`, {
      exerciseId,
    })
    return data
  },

  async skip(sessionExerciseId: string): Promise<SessionExercise> {
    const { data } = await api.post<SessionExercise>(
      `/api/session-exercises/${sessionExerciseId}/skip`,
    )
    return data
  },
  async unskip(sessionExerciseId: string): Promise<SessionExercise> {
    const { data } = await api.post<SessionExercise>(
      `/api/session-exercises/${sessionExerciseId}/unskip`,
    )
    return data
  },
  async substitute(sessionExerciseId: string, exerciseId: string): Promise<Session> {
    const { data } = await api.post<Session>(
      `/api/session-exercises/${sessionExerciseId}/substitute`,
      { exerciseId },
    )
    return data
  },
  async updateExerciseNotes(
    sessionExerciseId: string,
    notes: string | null,
  ): Promise<SessionExercise> {
    const { data } = await api.patch<SessionExercise>(
      `/api/session-exercises/${sessionExerciseId}`,
      {
        notes,
      },
    )
    return data
  },

  async addSet(sessionExerciseId: string, payload: SetRequest): Promise<SessionExercise> {
    const { data } = await api.post<SessionExercise>(
      `/api/session-exercises/${sessionExerciseId}/sets`,
      payload,
    )
    return data
  },
  async updateSet(setId: string, payload: SetRequest): Promise<SessionExercise> {
    const { data } = await api.put<SessionExercise>(`/api/sets/${setId}`, payload)
    return data
  },
  async deleteSet(setId: string): Promise<SessionExercise> {
    const { data } = await api.delete<SessionExercise>(`/api/sets/${setId}`)
    return data
  },

  async createObservation(payload: ObservationRequest): Promise<Observation> {
    const { data } = await api.post<Observation>('/api/observations', payload)
    return data
  },
  async updateObservation(id: string, payload: ObservationRequest): Promise<Observation> {
    const { data } = await api.put<Observation>(`/api/observations/${id}`, payload)
    return data
  },
  async deleteObservation(id: string): Promise<void> {
    await api.delete(`/api/observations/${id}`)
  },
}
