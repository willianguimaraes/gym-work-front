import { api } from './api'
import type { Dashboard } from '@/types/dashboard'

export const dashboardService = {
  async get(): Promise<Dashboard> {
    const { data } = await api.get<Dashboard>('/api/dashboard')
    return data
  },
}
