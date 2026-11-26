import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'
import { configureAuth, refreshSession } from '@/services/api'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth'
import router from '@/router'

/** Chave usada pela versão anterior, que guardava o token no localStorage. */
const LEGACY_TOKEN_KEY = 'gymwork.token'

/**
 * Sessão do usuário. O token de acesso fica só em memória (não é lido por scripts injetados via
 * localStorage); ao recarregar a página a sessão é restaurada pelo cookie HttpOnly de refresh.
 */
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!accessToken.value)

  let restorePromise: Promise<void> | null = null

  function applySession(session: AuthResponse) {
    accessToken.value = session.accessToken
    user.value = session.user
  }

  function clearSession() {
    accessToken.value = null
    user.value = null
  }

  configureAuth({
    getAccessToken: () => accessToken.value,
    onRefreshed: applySession,
    onSessionExpired: () => {
      clearSession()
      const current = router.currentRoute.value
      if (current.meta.requiresAuth) {
        void router.replace({ name: 'login', query: { redirect: current.fullPath } })
      }
    },
  })

  /** Tenta restaurar a sessão uma única vez ao abrir o app. */
  function restore(): Promise<void> {
    restorePromise ??= (async () => {
      try {
        localStorage.removeItem(LEGACY_TOKEN_KEY)
      } catch {
        // ignorado
      }
      await refreshSession()
    })()
    return restorePromise
  }

  async function login(payload: LoginRequest) {
    applySession(await authService.login(payload))
  }

  async function register(payload: RegisterRequest) {
    applySession(await authService.register(payload))
  }

  async function logout() {
    try {
      await authService.logout()
    } finally {
      clearSession()
    }
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    restore,
    login,
    register,
    logout,
    applySession,
    clearSession,
  }
})
