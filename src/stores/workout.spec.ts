import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { workoutService } from '@/services/workout.service'
import type { Session, SessionExercise, SetRequest } from '@/types/workout'
import { useWorkoutStore } from './workout'

vi.mock('@/services/workout.service', () => ({
  workoutService: { addSet: vi.fn(), get: vi.fn() },
}))

const addSet = vi.mocked(workoutService.addSet)
const getSession = vi.mocked(workoutService.get)

function exercise(): SessionExercise {
  return { id: 'ex-1', sets: [], lastExecution: null } as unknown as SessionExercise
}

function session(): Session {
  return {
    id: 's-1',
    status: 'IN_PROGRESS',
    completedSets: 0,
    exercises: [exercise()],
  } as unknown as Session
}

const payload: SetRequest = {
  setType: 'WORKING',
  status: 'COMPLETED',
  loadKg: 60,
  reps: 8,
} as SetRequest

const networkError = new AxiosError('Network Error', 'ERR_NETWORK')

function rejected(status: number, detail: string): AxiosError {
  return new AxiosError('recusada', 'ERR', undefined, undefined, {
    status,
    data: { status, detail },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse)
}

describe('fila de séries offline', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    addSet.mockReset()
    getSession.mockReset()
  })

  it('sem rede, a série aparece na tela, fica na fila e é enviada quando a API volta', async () => {
    const store = useWorkoutStore()
    store.setSession(session())

    addSet.mockRejectedValueOnce(networkError)
    expect(await store.addSet(exercise(), payload)).toBeNull()
    expect(store.offline).toBe(true)
    expect(store.pendingCount()).toBe(1)
    expect(store.session?.exercises[0]?.sets[0]?.pending).toBe(true)
    expect(store.session?.completedSets).toBe(1)
    const queued = JSON.parse(localStorage.getItem('gymwork.pendingSets') ?? '[]')
    expect(queued).toHaveLength(1)

    const clientId = queued[0].clientId as string
    addSet.mockResolvedValueOnce({
      ...exercise(),
      sets: [{ id: 'set-1', clientId, setType: 'WORKING', status: 'COMPLETED', reps: 8 }],
    } as unknown as SessionExercise)
    await store.flush()
    // reenvia com o mesmo clientId (a API não duplica)
    expect(addSet).toHaveBeenLastCalledWith('ex-1', expect.objectContaining({ clientId }))
    expect(store.pendingCount()).toBe(0)
    expect(store.offline).toBe(false)
    expect(store.session?.exercises[0]?.sets).toHaveLength(1)
    expect(store.session?.exercises[0]?.sets[0]?.pending).toBeFalsy()
  })

  it('série recusada pela API sai da fila e da tela, com a mensagem do servidor', async () => {
    const store = useWorkoutStore()
    store.setSession(session())
    addSet.mockRejectedValueOnce(rejected(400, 'Repetições obrigatórias'))

    expect(await store.addSet(exercise(), payload)).toBe('Repetições obrigatórias')
    expect(store.pendingCount()).toBe(0)
    expect(store.session?.exercises[0]?.sets).toHaveLength(0)
    expect(store.failures).toContain('Repetições obrigatórias')
  })

  it('sem rede, reabre o treino em andamento pela cópia salva no aparelho', async () => {
    const store = useWorkoutStore()
    store.setSession(session())
    expect(store.cachedSession()?.id).toBe('s-1')

    setActivePinia(createPinia())
    const reopened = useWorkoutStore()
    getSession.mockRejectedValueOnce(networkError)
    await reopened.load('s-1')
    expect(reopened.session?.id).toBe('s-1')
    expect(reopened.offline).toBe(true)

    getSession.mockRejectedValueOnce(networkError)
    await expect(reopened.load('outra')).rejects.toBe(networkError)
  })
})
