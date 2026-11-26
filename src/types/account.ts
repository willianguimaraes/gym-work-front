export type WeightUnit = 'KG' | 'LB'
export type LengthUnit = 'CM' | 'IN'
export type ThemePreference = 'DARK' | 'LIGHT' | 'SYSTEM'

export interface Profile {
  id: string
  name: string
  email: string
  /** Sempre em centímetros. */
  heightCm: number | null
  /** ISO yyyy-MM-dd */
  birthDate: string | null
  createdAt: string
}

export interface UpdateProfileRequest {
  name: string
  heightCm: number | null
  birthDate: string | null
}

export interface Settings {
  weightUnit: WeightUnit
  lengthUnit: LengthUnit
  theme: ThemePreference
  defaultRestSeconds: number
  restSoundEnabled: boolean
  timezone: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
