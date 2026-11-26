export interface User {
  id: number
  name: string
  email: string
  createdAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: User
}

/** Erro padrão da API (RFC 9457 — application/problem+json). */
export interface ProblemDetail {
  status: number
  title: string
  detail?: string
  errors?: Record<string, string>
}
