import type { Equipment, ExerciseType } from '@/types/exercise'
import type { DayOfWeek, PlanGoal, PlanStatus } from '@/types/training'

/** Rótulos em português dos enums da API (os valores enviados continuam em inglês). */

export const equipmentLabel: Record<Equipment, string> = {
  BARBELL: 'Barra',
  DUMBBELL: 'Halteres',
  MACHINE: 'Máquina',
  CABLE: 'Polia',
  SMITH: 'Smith',
  BODYWEIGHT: 'Peso corporal',
  KETTLEBELL: 'Kettlebell',
  BAND: 'Elástico',
  OTHER: 'Outro',
}

export const exerciseTypeLabel: Record<ExerciseType, string> = {
  COMPOUND: 'Multiarticular',
  ISOLATION: 'Isolado',
}

export const goalLabel: Record<PlanGoal, string> = {
  HYPERTROPHY: 'Hipertrofia',
  STRENGTH: 'Força',
  FAT_LOSS: 'Emagrecimento',
  MAINTENANCE: 'Manutenção',
  OTHER: 'Outro',
}

export const statusLabel: Record<PlanStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluído',
  ARCHIVED: 'Arquivado',
}

export const statusColor: Record<PlanStatus, string> = {
  DRAFT: 'grey-7',
  ACTIVE: 'positive',
  COMPLETED: 'primary',
  ARCHIVED: 'grey-8',
}

export const dayOfWeekLabel: Record<DayOfWeek, string> = {
  MONDAY: 'Segunda',
  TUESDAY: 'Terça',
  WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta',
  FRIDAY: 'Sexta',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
}

export function options<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))
}

/** "2026-01-05" → "05/01/2026" (sem passar por fuso horário). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export function formatPeriod(start: string | null, end: string | null): string {
  if (start && end) return `${formatDate(start)} – ${formatDate(end)}`
  if (start) return `Início em ${formatDate(start)}`
  return ''
}

export function formatRest(seconds: number | null): string {
  if (seconds == null) return ''
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`
}
