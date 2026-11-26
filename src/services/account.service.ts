import { api } from './api'
import type { AuthResponse } from '@/types/auth'
import type {
  ChangePasswordRequest,
  Profile,
  Settings,
  UpdateProfileRequest,
} from '@/types/account'

export const accountService = {
  async getProfile(): Promise<Profile> {
    const { data } = await api.get<Profile>('/api/me')
    return data
  },

  async updateProfile(payload: UpdateProfileRequest): Promise<Profile> {
    const { data } = await api.put<Profile>('/api/me', payload)
    return data
  },

  async getSettings(): Promise<Settings> {
    const { data } = await api.get<Settings>('/api/me/settings')
    return data
  },

  async updateSettings(payload: Settings): Promise<Settings> {
    const { data } = await api.put<Settings>('/api/me/settings', payload)
    return data
  },

  /** Troca a senha; a API encerra as outras sessões e devolve uma nova para este dispositivo. */
  async changePassword(payload: ChangePasswordRequest): Promise<AuthResponse> {
    const { data } = await api.put<AuthResponse>('/api/me/password', payload)
    return data
  },

  async deleteAccount(password: string): Promise<void> {
    await api.delete('/api/me', { data: { password } })
  },
}
