import type { Equipment, ExerciseType } from '@/types/exercise'
import type { DayOfWeek, PlanGoal, PlanStatus } from '@/types/training'
import type {
  BodyRegion,
  BodySide,
  ObservationCategory,
  ObservationMoment,
  SessionExerciseStatus,
  SetStatus,
  SetType,
} from '@/types/workout'

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

// ---------------------------------------------------------------------------- execução

export const setTypeLabel: Record<SetType, string> = {
  WARMUP: 'Aquecimento',
  ACTIVATION: 'Ativação',
  WORKING: 'Série',
  DROP_SET: 'Drop set',
  REST_PAUSE: 'Rest-pause',
  EXTRA: 'Adicional',
}

export const setTypeShort: Record<SetType, string> = {
  WARMUP: 'Aq',
  ACTIVATION: 'At',
  WORKING: '',
  DROP_SET: 'Drop',
  REST_PAUSE: 'RP',
  EXTRA: '+',
}

export const setStatusLabel: Record<SetStatus, string> = {
  COMPLETED: 'Concluída',
  NOT_PERFORMED: 'Não realizada',
  INTERRUPTED: 'Interrompida',
  SUBSTITUTED: 'Substituída',
}

export const exerciseStatusLabel: Record<SessionExerciseStatus, string> = {
  PENDING: 'A fazer',
  PARTIAL: 'Parcial',
  DONE: 'Feito',
  SKIPPED: 'Pulado',
  SUBSTITUTED: 'Substituído',
}

export const exerciseStatusColor: Record<SessionExerciseStatus, string> = {
  PENDING: 'grey-7',
  PARTIAL: 'warning',
  DONE: 'positive',
  SKIPPED: 'grey-8',
  SUBSTITUTED: 'grey-8',
}

export const categoryLabel: Record<ObservationCategory, string> = {
  PAIN: 'Dor',
  DISCOMFORT: 'Desconforto',
  RECOVERY: 'Recuperação',
  SLEEP: 'Sono',
  ENERGY: 'Energia',
  EXECUTION_DIFFICULTY: 'Dificuldade de execução',
  EQUIPMENT_UNAVAILABLE: 'Equipamento indisponível',
  GENERAL: 'Observação geral',
}

export const categoryIcon: Record<ObservationCategory, string> = {
  PAIN: 'healing',
  DISCOMFORT: 'sentiment_dissatisfied',
  RECOVERY: 'self_improvement',
  SLEEP: 'bedtime',
  ENERGY: 'bolt',
  EXECUTION_DIFFICULTY: 'psychology_alt',
  EQUIPMENT_UNAVAILABLE: 'block',
  GENERAL: 'notes',
}

export const bodyRegionLabel: Record<BodyRegion, string> = {
  NECK: 'Pescoço',
  SHOULDER: 'Ombro',
  UPPER_BACK: 'Costas (alto)',
  LOWER_BACK: 'Lombar',
  CHEST: 'Peito',
  ELBOW: 'Cotovelo',
  WRIST: 'Punho',
  HAND: 'Mão',
  ABDOMEN: 'Abdômen',
  HIP: 'Quadril',
  GLUTE: 'Glúteo',
  THIGH: 'Coxa',
  KNEE: 'Joelho',
  CALF: 'Panturrilha',
  ANKLE: 'Tornozelo',
  FOOT: 'Pé',
  OTHER: 'Outra',
}

export const bodySideLabel: Record<BodySide, string> = {
  LEFT: 'Esquerdo',
  RIGHT: 'Direito',
  BOTH: 'Ambos',
}

export const momentLabel: Record<ObservationMoment, string> = {
  BEFORE: 'Antes do treino',
  DURING: 'Durante',
  AFTER: 'Depois',
}

/** Data e hora locais: "26/11/2026 07:30". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Data local curta a partir de um instante: "26/11". */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Duração entre dois instantes: "1 h 05 min" ou "42 min". */
export function formatDuration(startIso: string, endIso: string | null | undefined): string {
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const minutes = Math.max(0, Math.round((end - new Date(startIso).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}
