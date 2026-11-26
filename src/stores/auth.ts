import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'
import { TOKEN_STORAGE_KEY, setUnauthorizedHandler } from '@/services/api'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY))
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  function applySession(response: AuthResponse) {
    token.value = response.accessToken
    user.value = response.user
    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken)
  }

  async function login(payload: LoginRequest) {
    applySession(await authService.login(payload))
  }

  async function register(payload: RegisterRequest) {
    applySession(await authService.register(payload))
  }

  /** Carrega o usuário quando já existe token salvo (ex.: ao recarregar a página). */
  async function loadUser() {
    if (!token.value || user.value) return
    user.value = await authService.me()
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }

  setUnauthorizedHandler(() => {
    logout()
    void router.replace({ name: 'login' })
  })

  return { token, user, isAuthenticated, login, register, loadUser, logout }
})
