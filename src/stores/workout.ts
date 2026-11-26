import { ref } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { getErrorMessage } from '@/services/api'
import { workoutService } from '@/services/workout.service'
import type { Session, SessionExercise, SetRequest, WorkoutSet } from '@/types/workout'
import { uuid } from '@/utils/uuid'

/**
 * Sessão aberta na tela de execução + fila local de séries (A11).
 *
 * Cada série vai para a API na hora. Se a rede cair, ela fica numa fila no navegador (com um
 * `clientId`) e é reenviada quando a conexão voltar; a API usa o `clientId` para não duplicar.
 * A última versão da sessão também fica guardada, para reabrir a tela mesmo sem rede.
 */
const QUEUE_KEY = 'gymwork.pendingSets'
const SESSION_KEY = 'gymwork.session'
const RETRY_MS = 20_000

interface QueuedSet {
  clientId: string
  sessionId: string
  sessionExerciseId: string
  payload: SetRequest
  queuedAt: string
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // armazenamento indisponível: segue só em memória
  }
}

/**
 * A API não foi alcançada: sem resposta (rede caiu, timeout), gateway/proxy sem o servidor
 * (502/503/504) ou erro que não veio da API (sem corpo ProblemDetail). Vale tentar de novo depois.
 */
export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const response = error.response
  if (!response) return true
  if ([502, 503, 504].includes(response.status)) return true
  const body = response.data as { status?: unknown } | undefined
  return response.status >= 500 && (typeof body !== 'object' || body?.status === undefined)
}

/** Séries válidas concluídas (trabalho e adicionais); aquecimento, drop set etc. não contam. */
export function countsAsSet(set: Pick<WorkoutSet, 'status' | 'setType'>): boolean {
  return set.status === 'COMPLETED' && (set.setType === 'WORKING' || set.setType === 'EXTRA')
}

export const useWorkoutStore = defineStore('workout', () => {
  const session = ref<Session | null>(null)
  const queue = ref<QueuedSet[]>(readJson<QueuedSet[]>(QUEUE_KEY, []))
  const syncing = ref(false)
  /** A tela está mostrando a cópia local porque a API não respondeu. */
  const offline = ref(false)
  /** Erros de séries recusadas pela API ao sincronizar a fila (a tela mostra e limpa). */
  const failures = ref<string[]>([])
  let retryTimer: ReturnType<typeof setInterval> | undefined

  function persistQueue() {
    writeJson(QUEUE_KEY, queue.value.length ? queue.value : null)
  }

  function recount(current: Session) {
    current.completedSets = current.exercises
      .flatMap((exercise) => exercise.sets)
      .filter(countsAsSet).length
  }

  /** Acrescenta à resposta da API as séries que ainda estão na fila local. */
  function withPending(exercise: SessionExercise): SessionExercise {
    const known = new Set(exercise.sets.map((set) => set.clientId).filter(Boolean))
    const pending = queue.value
      .filter((item) => item.sessionExerciseId === exercise.id && !known.has(item.clientId))
      .map((item, index) => localSet(item, exercise.sets.length + index + 1))
    return pending.length ? { ...exercise, sets: [...exercise.sets, ...pending] } : exercise
  }

  function setSession(loaded: Session | null) {
    if (!loaded) {
      session.value = null
      return
    }
    const merged = { ...loaded, exercises: loaded.exercises.map(withPending) }
    recount(merged)
    session.value = merged
    if (loaded.status === 'IN_PROGRESS') writeJson(SESSION_KEY, loaded)
    else if (readJson<Session | null>(SESSION_KEY, null)?.id === loaded.id)
      writeJson(SESSION_KEY, null)
  }

  /** Carrega a sessão; sem rede, usa a cópia local da sessão em andamento, se for a mesma. */
  async function load(id: string) {
    try {
      setSession(await workoutService.get(id))
      offline.value = false
    } catch (error) {
      const cached = readJson<Session | null>(SESSION_KEY, null)
      if (isNetworkError(error) && cached?.id === id) {
        setSession(cached)
        offline.value = true
        return
      }
      throw error
    }
    void flush()
  }

  function replaceExercise(updated: SessionExercise) {
    const current = session.value
    if (!current) return
    const index = current.exercises.findIndex((exercise) => exercise.id === updated.id)
    if (index < 0) return
    const previous = current.exercises[index]!
    current.exercises[index] = withPending({ ...updated, lastExecution: previous.lastExecution })
    recount(current)
    if (current.status === 'IN_PROGRESS') {
      const cached = { ...current, exercises: current.exercises.map(stripPending) }
      writeJson(SESSION_KEY, cached)
    }
  }

  /**
   * Registra uma série: aparece na hora na tela e vai para a fila; a fila é enviada em seguida.
   * Resolve com o erro da API se ela recusar a série (ex.: dados inválidos).
   */
  async function addSet(exercise: SessionExercise, payload: SetRequest): Promise<string | null> {
    const current = session.value
    if (!current) return null
    const item: QueuedSet = {
      clientId: uuid(),
      sessionId: current.id,
      sessionExerciseId: exercise.id,
      payload,
      queuedAt: new Date().toISOString(),
    }
    item.payload = { ...payload, clientId: item.clientId }
    queue.value.push(item)
    persistQueue()
    const target = current.exercises.find((e) => e.id === exercise.id)
    if (target) {
      target.sets.push(localSet(item, target.sets.length + 1))
      recount(current)
    }
    const errors = await flush()
    return errors.find((e) => e.clientId === item.clientId)?.message ?? null
  }

  /** Envia a fila em ordem. Para no primeiro erro de rede e tenta de novo mais tarde. */
  async function flush(): Promise<{ clientId: string; message: string }[]> {
    const rejected: { clientId: string; message: string }[] = []
    if (syncing.value || !queue.value.length) return rejected
    syncing.value = true
    try {
      while (queue.value.length) {
        const item = queue.value[0]!
        try {
          const updated = await workoutService.addSet(item.sessionExerciseId, item.payload)
          queue.value.shift()
          persistQueue()
          offline.value = false
          if (session.value?.id === item.sessionId) replaceExercise(updated)
        } catch (error) {
          if (isNetworkError(error)) {
            offline.value = true
            break
          }
          // recusada pela API: descarta da fila e tira da tela
          queue.value.shift()
          persistQueue()
          removeLocal(item.clientId)
          const message = getErrorMessage(error)
          rejected.push({ clientId: item.clientId, message })
          failures.value.push(message)
        }
      }
    } finally {
      syncing.value = false
      scheduleRetry()
    }
    return rejected
  }

  function scheduleRetry() {
    if (queue.value.length && !retryTimer) {
      retryTimer = setInterval(() => void flush(), RETRY_MS)
    } else if (!queue.value.length && retryTimer) {
      clearInterval(retryTimer)
      retryTimer = undefined
    }
  }

  function removeLocal(clientId: string) {
    const current = session.value
    if (!current) return
    for (const exercise of current.exercises) {
      exercise.sets = exercise.sets.filter((set) => !(set.pending && set.clientId === clientId))
    }
    recount(current)
  }

  function pendingCount(sessionId?: string) {
    return queue.value.filter((item) => !sessionId || item.sessionId === sessionId).length
  }

  function clear() {
    session.value = null
    writeJson(SESSION_KEY, null)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void flush())
    scheduleRetry()
  }

  return {
    session,
    queue,
    syncing,
    offline,
    failures,
    setSession,
    load,
    replaceExercise,
    addSet,
    flush,
    pendingCount,
    clear,
  }
})

function localSet(item: QueuedSet, setNumber: number): WorkoutSet {
  return {
    id: `local-${item.clientId}`,
    sessionExerciseId: item.sessionExerciseId,
    clientId: item.clientId,
    setNumber,
    setType: item.payload.setType,
    parentSetId: item.payload.parentSetId,
    status: item.payload.status,
    loadKg: item.payload.loadKg,
    reps: item.payload.reps,
    rir: item.payload.rir,
    restSeconds: item.payload.restSeconds,
    notes: item.payload.notes,
    performedAt: item.queuedAt,
    pending: true,
  }
}

function stripPending(exercise: SessionExercise): SessionExercise {
  return { ...exercise, sets: exercise.sets.filter((set) => !set.pending) }
}
