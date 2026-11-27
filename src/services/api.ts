import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse, ProblemDetail } from '@/types/auth'

const baseURL = import.meta.env.VITE_API_URL || ''

/** Cliente da API. `withCredentials` envia o cookie de refresh quando a API está em outro subdomínio. */
export const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

/** Cliente sem interceptors, usado só para renovar a sessão (evita recursão no 401). */
const refreshClient = axios.create({ baseURL, timeout: 15000, withCredentials: true })

interface AuthHooks {
  getAccessToken: () => string | null
  onRefreshed: (session: AuthResponse) => void
  onSessionExpired: () => void
}

let hooks: AuthHooks | null = null

/** Registrado pela store de autenticação (evita dependência circular api ↔ store). */
export function configureAuth(authHooks: AuthHooks) {
  hooks = authHooks
}

let refreshInFlight: Promise<AuthResponse | null> | null = null

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

/**
 * Renova o token de acesso usando o cookie de refresh. Chamadas simultâneas compartilham a mesma
 * requisição, e o Web Locks API serializa a renovação entre abas (o cookie é trocado a cada uso).
 * Retorna `null` se não houver sessão válida; **lança o erro** se a API não for alcançada (sem
 * internet), para o app não tratar a falta de rede como sessão encerrada.
 */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshInFlight ??= withCrossTabLock(async () => {
    try {
      const { data } = await refreshClient.post<AuthResponse>('/api/auth/refresh')
      hooks?.onRefreshed(data)
      return data
    } catch (error) {
      if (isNetworkError(error)) throw error
      return null
    }
  }).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('gymwork-session-refresh', task)
  }
  return task()
}

api.interceptors.request.use((config) => {
  const token = hooks?.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    const isAuthEndpoint = config?.url?.startsWith('/api/auth/')

    // Token de acesso expirado: renova uma vez e repete a requisição original
    if (error.response?.status === 401 && config && !isAuthEndpoint && !config._retried) {
      config._retried = true
      let session: AuthResponse | null
      try {
        session = await refreshSession()
      } catch (networkError) {
        // sem internet: devolve o erro de rede (a fila offline guarda e tenta de novo depois)
        return Promise.reject(networkError)
      }
      if (session) {
        config.headers.Authorization = `Bearer ${session.accessToken}`
        return api(config)
      }
      hooks?.onSessionExpired()
    }
    return Promise.reject(error)
  },
)

/** Extrai uma mensagem amigável de um erro da API. */
export function getErrorMessage(
  error: unknown,
  fallback = 'Algo deu errado. Tente novamente.',
): string {
  if (axios.isAxiosError<ProblemDetail>(error)) {
    if (!error.response || [502, 503, 504].includes(error.response.status)) {
      return 'Sem conexão com o servidor.'
    }
    const data = error.response.data
    if (data?.errors) return Object.values(data.errors).join('\n')
    if (data?.detail) return data.detail
  }
  return fallback
}

/** Erros por campo (`errors` do ProblemDetail), para exibir direto nos inputs. */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError<ProblemDetail>(error)) {
    return error.response?.data?.errors ?? {}
  }
  return {}
}
