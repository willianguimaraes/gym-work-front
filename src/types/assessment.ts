export type MeasurementType =
  | 'SHOULDERS'
  | 'CHEST'
  | 'WAIST'
  | 'ABDOMEN'
  | 'ARM_RIGHT'
  | 'ARM_LEFT'
  | 'FOREARM_RIGHT'
  | 'FOREARM_LEFT'
  | 'THIGH_RIGHT'
  | 'THIGH_LEFT'
  | 'CALF_RIGHT'
  | 'CALF_LEFT'
export type PhotoPosition = 'FRONT' | 'RIGHT' | 'LEFT' | 'BACK' | 'OTHER'

export interface MeasurementValue {
  type: MeasurementType
  /** Sempre em cm. */
  valueCm: number
}

export interface Photo {
  id: string
  assessmentId: string
  position: PhotoPosition
  contentType: string
  sizeBytes: number
  width: number | null
  height: number | null
  /** URL temporária (5 min). */
  url: string
  urlExpiresAt: string
  createdAt: string
}

export interface Assessment {
  id: string
  assessedOn: string
  /** kg */
  weightKg: number | null
  /** cm */
  heightCm: number | null
  bodyFatPct: number | null
  notes: string | null
  measurements: MeasurementValue[]
  photos: Photo[]
}

export interface AssessmentRequest {
  assessedOn: string
  weightKg: number | null
  heightCm: number | null
  bodyFatPct: number | null
  notes: string | null
  measurements: MeasurementValue[]
}

export interface AssessmentSummary {
  id: string
  assessedOn: string
  weightKg: number | null
  bodyFatPct: number | null
  measurementsCount: number
  photosCount: number
}

export interface ComparisonItem {
  metric: 'WEIGHT' | 'BODY_FAT' | 'HEIGHT' | MeasurementType
  unit: 'kg' | '%' | 'cm'
  fromValue: number | null
  toValue: number | null
  difference: number | null
}

export interface Comparison {
  from: Assessment
  to: Assessment
  daysBetween: number
  items: ComparisonItem[]
  photos: { position: PhotoPosition; from: Photo | null; to: Photo | null }[]
}

export interface TrendPoint {
  assessmentId: string
  assessedOn: string
  weightKg: number | null
  bodyFatPct: number | null
  measurements: Partial<Record<MeasurementType, number>>
}
