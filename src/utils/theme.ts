import { Dark } from 'quasar'
import type { ThemePreference } from '@/types/account'

/**
 * O tema é salvo nas configurações do usuário (API) e também localmente, para que a tela de login
 * e o primeiro carregamento já abram no tema certo, antes de a sessão ser restaurada.
 */
const STORAGE_KEY = 'gymwork.theme'
const DEFAULT_THEME: ThemePreference = 'DARK'

export function getStoredTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)?.toUpperCase()
    return value === 'DARK' || value === 'LIGHT' || value === 'SYSTEM' ? value : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** Converte a preferência no valor aceito pelo Quasar (`'auto'` segue o sistema operacional). */
export function toQuasarDark(theme: ThemePreference): boolean | 'auto' {
  return theme === 'SYSTEM' ? 'auto' : theme === 'DARK'
}

export function applyTheme(theme: ThemePreference) {
  Dark.set(toQuasarDark(theme))
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // sem armazenamento disponível: o tema vale só para esta sessão
  }
}
