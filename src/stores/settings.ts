import { ref } from 'vue'
import { defineStore } from 'pinia'
import { accountService } from '@/services/account.service'
import { isNetworkError } from '@/services/api'
import type { Settings } from '@/types/account'
import { applyTheme } from '@/utils/theme'

const SETTINGS_KEY = 'gymwork.settings'

function read(): Settings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as Settings) : null
  } catch {
    return null
  }
}

function save(value: Settings | null) {
  try {
    if (value) localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
    else localStorage.removeItem(SETTINGS_KEY)
  } catch {
    // armazenamento indisponível
  }
}

/** Preferências do usuário (unidades, tema, descanso padrão…), sincronizadas com a API. */
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings | null>(null)

  async function load() {
    try {
      settings.value = await accountService.getSettings()
      save(settings.value)
    } catch (error) {
      const cached = read()
      if (!cached || !isNetworkError(error)) throw error
      // sem internet: usa as últimas preferências salvas no aparelho (unidades, tema)
      settings.value = cached
    }
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
      save(settings.value)
    } catch (error) {
      settings.value = previous
      applyTheme(previous.theme)
      throw error
    }
  }

  function reset() {
    settings.value = null
    save(null)
  }

  return { settings, load, update, reset }
})
