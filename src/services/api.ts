import axios, { AxiosError } from 'axios'
import type { ProblemDetail } from '@/types/auth'

export const TOKEN_STORAGE_KEY = 'gymwork.token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null

/** Registrado pela store de auth: chamado quando a API responde 401 (token expirado/inválido). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isAuthEndpoint = error.config?.url?.startsWith('/api/auth/')
    if (error.response?.status === 401 && !isAuthEndpoint) {
      onUnauthorized?.()
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
    if (!error.response) return 'Sem conexão com o servidor.'
    const data = error.response.data
    if (data?.errors) return Object.values(data.errors).join('\n')
    if (data?.detail) return data.detail
  }
  return fallback
}
