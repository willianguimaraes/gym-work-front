import { api } from './api'
import type { Page } from '@/types/exercise'
import type {
  Assessment,
  AssessmentRequest,
  AssessmentSummary,
  Comparison,
  Photo,
  PhotoPosition,
  TrendPoint,
} from '@/types/assessment'

/** Avaliações físicas, fotos e comparativos. */
export const assessmentService = {
  async list(page = 0, size = 20): Promise<Page<AssessmentSummary>> {
    const { data } = await api.get<Page<AssessmentSummary>>('/api/assessments', {
      params: { page, size },
    })
    return data
  },
  async get(id: string): Promise<Assessment> {
    const { data } = await api.get<Assessment>(`/api/assessments/${id}`)
    return data
  },
  async create(payload: AssessmentRequest): Promise<Assessment> {
    const { data } = await api.post<Assessment>('/api/assessments', payload)
    return data
  },
  async update(id: string, payload: AssessmentRequest): Promise<Assessment> {
    const { data } = await api.put<Assessment>(`/api/assessments/${id}`, payload)
    return data
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/api/assessments/${id}`)
  },
  async trend(): Promise<TrendPoint[]> {
    const { data } = await api.get<TrendPoint[]>('/api/assessments/trend')
    return data
  },
  async compare(a: string, b: string): Promise<Comparison> {
    const { data } = await api.get<Comparison>('/api/assessments/compare', { params: { a, b } })
    return data
  },

  async uploadPhoto(
    assessmentId: string,
    file: Blob,
    fileName: string,
    position: PhotoPosition,
  ): Promise<Photo> {
    const form = new FormData()
    form.append('file', file, fileName)
    // o Content-Type explícito evita que o axios converta o FormData em JSON (padrão da instância)
    const { data } = await api.post<Photo>(`/api/assessments/${assessmentId}/photos`, form, {
      params: { position },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
    return data
  },
  async photoUrl(photoId: string): Promise<{ url: string; expiresAt: string }> {
    const { data } = await api.get<{ url: string; expiresAt: string }>(`/api/photos/${photoId}/url`)
    return data
  },
  async movePhoto(photoId: string, position: PhotoPosition): Promise<Photo> {
    const { data } = await api.patch<Photo>(`/api/photos/${photoId}`, { position })
    return data
  },
  async deletePhoto(photoId: string): Promise<void> {
    await api.delete(`/api/photos/${photoId}`)
  },
}
