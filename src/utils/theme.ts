import { Dark } from 'quasar'

export type ThemeMode = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'gymwork.theme'
const DEFAULT_THEME: ThemeMode = 'dark'

export function getStoredTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'dark' || value === 'light' || value === 'system' ? value : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** Converte a preferência no valor aceito pelo Quasar (`'auto'` segue o sistema operacional). */
export function toQuasarDark(mode: ThemeMode): boolean | 'auto' {
  return mode === 'system' ? 'auto' : mode === 'dark'
}

export function applyTheme(mode: ThemeMode) {
  Dark.set(toQuasarDark(mode))
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // sem armazenamento disponível: o tema vale só para esta sessão
  }
}
