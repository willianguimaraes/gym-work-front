export interface User {
  id: string
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

/** O refresh token nunca vem no corpo: fica num cookie HttpOnly gerenciado pelo navegador. */
export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: User
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

/** Erro padrão da API (RFC 9457 — application/problem+json). */
export interface ProblemDetail {
  status: number
  title: string
  detail?: string
  errors?: Record<string, string>
}
