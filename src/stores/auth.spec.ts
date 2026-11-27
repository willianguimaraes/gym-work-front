import { AxiosError } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshSession } from '@/services/api'
import { useAuthStore } from './auth'

vi.mock('@/router', () => ({
  default: { currentRoute: { value: { meta: {}, fullPath: '/' } }, replace: vi.fn() },
}))
vi.mock('@/services/api', () => ({ configureAuth: vi.fn(), refreshSession: vi.fn() }))
vi.mock('@/services/auth.service', () => ({ authService: {} }))

const refresh = vi.mocked(refreshSession)
const user = {
  id: 'u-1',
  name: 'Ana Souza',
  email: 'ana@gym.test',
  createdAt: '2026-11-01T00:00:00Z',
}

describe('sessão sem internet', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    refresh.mockReset()
  })

  it('sem rede ao abrir, entra no modo sem conexão com o último usuário', async () => {
    localStorage.setItem('gymwork.user', JSON.stringify(user))
    refresh.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
    const auth = useAuthStore()
    await auth.restore()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.offline).toBe(true)
    expect(auth.canUseApp).toBe(true)
    expect(auth.user?.name).toBe('Ana Souza')

    // a rede volta e a sessão é confirmada
    refresh.mockImplementationOnce(async () => {
      auth.applySession({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 900, user })
      return { accessToken: 'token', tokenType: 'Bearer', expiresIn: 900, user }
    })
    await auth.reconnect()
    expect(auth.offline).toBe(false)
    expect(auth.isAuthenticated).toBe(true)
  })

  it('sem rede e sem usuário salvo, vai para o login', async () => {
    refresh.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
    const auth = useAuthStore()
    await auth.restore()
    expect(auth.canUseApp).toBe(false)
  })

  it('sessão recusada pela API apaga o usuário salvo', async () => {
    localStorage.setItem('gymwork.user', JSON.stringify(user))
    refresh.mockResolvedValueOnce(null)
    const auth = useAuthStore()
    await auth.restore()
    expect(auth.canUseApp).toBe(false)
    expect(localStorage.getItem('gymwork.user')).toBeNull()
  })
})
