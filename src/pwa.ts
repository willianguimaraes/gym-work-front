import { Notify } from 'quasar'
import { registerSW } from 'virtual:pwa-register'

/**
 * Registra o service worker (só existe no build). Quando sai uma versão nova, pergunta antes de
 * recarregar, para não interromper um treino: a troca acontece quando o usuário tocar em "Atualizar".
 */
export function setupPwa() {
  if (!('serviceWorker' in navigator)) return
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      Notify.create({
        message: 'Nova versão do app disponível',
        icon: 'system_update',
        color: 'primary',
        timeout: 0,
        actions: [
          { label: 'Depois', color: 'white' },
          {
            label: 'Atualizar',
            color: 'white',
            handler: () => void updateServiceWorker(true),
          },
        ],
      })
    },
  })
}
