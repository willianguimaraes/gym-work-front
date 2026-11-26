import { ref } from 'vue'
import { defineStore } from 'pinia'
import { accountService } from '@/services/account.service'
import type { Settings } from '@/types/account'
import { applyTheme } from '@/utils/theme'

/** Preferências do usuário (unidades, tema, descanso padrão…), sincronizadas com a API. */
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null)

  async function load() {
    settings.value = await accountService.getSettings()
    applyTheme(settings.value.theme)
  }

  /** Aplica a mudança na hora e salva; se a API recusar, volta ao valor anterior. */
  async function update(changes: Partial<Settings>) {
    if (!settings.value) return
    const previous = settings.value
    const next = { ...previous, ...changes }
    settings.value = next
    if (changes.theme) applyTheme(changes.theme)
    try {
      settings.value = await accountService.updateSettings(next)
    } catch (error) {
      settings.value = previous
      applyTheme(previous.theme)
      throw error
    }
  }

  function reset() {
    settings.value = null
  }

  return { settings, load, update, reset }
})
