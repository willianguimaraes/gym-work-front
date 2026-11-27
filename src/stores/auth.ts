import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authService } from '@/services/auth.service'
import { configureAuth, refreshSession } from '@/services/api'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth'
import router from '@/router'

/** Chave usada pela versão anterior, que guardava o token no localStorage. */
const LEGACY_TOKEN_KEY = 'gymwork.token'
/** Nome e e-mail do último usuário (sem token), para abrir o app sem internet. */
const USER_KEY = 'gymwork.user'
/** Sem internet, tenta reconectar a cada 30 s (e quando o navegador avisa que voltou). */
const RECONNECT_MS = 30000

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function writeUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    // armazenamento indisponível: o modo sem internet só não fica disponível
  }
}

/**
 * Sessão do usuário. O token de acesso fica só em memória (não é lido por scripts injetados via
 * localStorage); ao recarregar a página a sessão é restaurada pelo cookie HttpOnly de refresh.
 *
 * Sem internet ao abrir o app, a sessão não pode ser confirmada: o app entra em modo sem conexão
 * com o último usuário (só nome e e-mail ficam no aparelho), mostra o que estiver salvo (treino em
 * andamento e fila de séries) e reconecta sozinho quando a rede volta.
 */
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!accessToken.value)
  /** Sem conexão com a API e sem sessão confirmada. */
  const offline = ref(false)
  /** Pode usar as telas: sessão válida, ou modo sem conexão com o último usuário. */
  const canUseApp = computed(() => isAuthenticated.value || (offline.value && !!user.value))
  let reconnectTimer: ReturnType<typeof setInterval> | undefined

  let restorePromise: Promise<void> | null = null

  function applySession(session: AuthResponse) {
    accessToken.value = session.accessToken
    user.value = session.user
    writeUser(session.user)
    leaveOffline()
  }

  function clearSession() {
    accessToken.value = null
    user.value = null
    writeUser(null)
    leaveOffline()
  }

  function enterOffline(): boolean {
    const cached = readUser()
    if (!cached) return false
    user.value = cached
    offline.value = true
    reconnectTimer ??= setInterval(() => void reconnect(), RECONNECT_MS)
    return true
  }

  function leaveOffline() {
    offline.value = false
    if (reconnectTimer) {
      clearInterval(reconnectTimer)
      reconnectTimer = undefined
    }
  }

  /** Rede de volta: confirma a sessão; se ela não vale mais, vai para o login. */
  async function reconnect() {
    if (!offline.value) return
    try {
      const session = await refreshSession()
      if (!session) {
        clearSession()
        const current = router.currentRoute.value
        if (current.meta.requiresAuth) {
          void router.replace({ name: 'login', query: { redirect: current.fullPath } })
        }
      }
    } catch {
      // ainda sem conexão
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void reconnect())
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
      try {
        const session = await refreshSession()
        if (!session) writeUser(null)
      } catch {
        enterOffline()
      }
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
    offline,
    canUseApp,
    restore,
    reconnect,
    login,
    register,
    logout,
    applySession,
    clearSession,
  }
})
