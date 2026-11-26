<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { useSettingsStore } from '@/stores/settings'
import { countsAsSet } from '@/stores/workout'
import type { SessionExercise, SetRequest, SetType, WorkoutSet } from '@/types/workout'
import {
  equipmentLabel,
  exerciseStatusColor,
  exerciseStatusLabel,
  formatRest,
  formatShortDate,
  setStatusLabel,
  setTypeLabel,
  setTypeShort,
} from '@/utils/labels'
import { displayToKg, kgToDisplay, weightLabel } from '@/utils/units'

/**
 * Card de um exercício na execução: o planejado, a última execução, as séries feitas e a linha de
 * registro rápido (carga × reps já preenchidas, um toque em ✓).
 */
const props = defineProps<{
  exercise: SessionExercise
  index: number
  readonly?: boolean
  busy?: boolean
  substituteName?: string | null
  /** Sessão finalizada: o que ficou "a fazer" passa a ser exibido como "não feito". */
  finished?: boolean
}>()

const emit = defineEmits<{
  record: [payload: SetRequest]
  editSet: [set: WorkoutSet]
  detailedSet: [initial: Partial<SetRequest>]
  skip: []
  unskip: []
  substitute: []
  observation: []
  notes: []
}>()

const catalog = useCatalogStore()
const settings = useSettingsStore()
const unit = computed(() => settings.settings?.weightUnit ?? 'KG')

const e = computed(() => props.exercise)
const substituted = computed(() => e.value.status === 'SUBSTITUTED')
const skipped = computed(() => e.value.status === 'SKIPPED')

const doneSets = computed(() => e.value.sets.filter(countsAsSet))
const lastWorking = computed(
  () =>
    e.value.lastExecution?.sets.filter((s) => s.setType === 'WORKING' || s.setType === 'EXTRA') ??
    [],
)

function displayLoad(kg: number | null | undefined): string {
  return kg == null ? '—' : `${kgToDisplay(kg, unit.value)}`
}

const planLine = computed(() => {
  const parts: string[] = []
  const x = e.value
  if (x.plannedSets != null && x.repsMin != null && x.repsMax != null) {
    parts.push(
      `${x.plannedSets} × ${x.repsMin === x.repsMax ? x.repsMin : `${x.repsMin}–${x.repsMax}`}`,
    )
  }
  if (x.restSeconds != null) parts.push(formatRest(x.restSeconds))
  if (x.targetRir != null) parts.push(`RIR ${x.targetRir}`)
  if (x.referenceLoadKg != null)
    parts.push(`ref. ${displayLoad(x.referenceLoadKg)} ${weightLabel[unit.value]}`)
  return parts.join(' · ')
})

const lastLine = computed(() => {
  const last = e.value.lastExecution
  if (!last || !lastWorking.value.length) return ''
  const loads = new Set(lastWorking.value.map((s) => s.loadKg))
  const reps = lastWorking.value.map((s) => s.reps ?? '—').join('/')
  const load =
    loads.size === 1
      ? `${displayLoad(lastWorking.value[0]!.loadKg)} ${weightLabel[unit.value]} · ${reps}`
      : lastWorking.value.map((s) => `${displayLoad(s.loadKg)}×${s.reps ?? '—'}`).join(', ')
  return `Última (${formatShortDate(last.performedAt)}): ${load}`
})

/** Sugestão para a próxima série: a série equivalente da última vez, ou a anterior desta sessão. */
const suggestion = computed(() => {
  const n = doneSets.value.length
  const previousHere = doneSets.value.at(-1)
  const fromLast = lastWorking.value[n] ?? lastWorking.value.at(-1)
  const loadKg = previousHere?.loadKg ?? fromLast?.loadKg ?? e.value.referenceLoadKg ?? null
  const reps = fromLast?.reps ?? previousHere?.reps ?? e.value.repsMin ?? null
  return { loadKg, reps }
})

const entry = reactive({
  load: '' as number | string,
  reps: '' as number | string,
  type: 'WORKING' as SetType,
})

function resetEntry() {
  entry.load =
    suggestion.value.loadKg == null ? '' : kgToDisplay(suggestion.value.loadKg, unit.value)
  entry.reps = suggestion.value.reps ?? ''
}
watch(() => e.value.sets.length, resetEntry, { immediate: true })

const typeOptions: SetType[] = [
  'WORKING',
  'WARMUP',
  'ACTIVATION',
  'DROP_SET',
  'REST_PAUSE',
  'EXTRA',
]

/** Série principal de drop set / rest-pause: a última série de trabalho já confirmada. */
const parentForDrop = computed(
  () =>
    [...e.value.sets]
      .reverse()
      .find((s) => !s.pending && (s.setType === 'WORKING' || s.setType === 'EXTRA'))?.id ?? null,
)

const canRecord = computed(() => entry.reps !== '' && Number(entry.reps) >= 0)

function record() {
  if (!canRecord.value) return
  const load = entry.load === '' ? null : displayToKg(Number(entry.load), unit.value)
  const type = entry.type
  emit('record', {
    setType: type,
    status: 'COMPLETED',
    loadKg: load,
    reps: Number(entry.reps),
    rir: null,
    restSeconds: null,
    notes: null,
    parentSetId: type === 'DROP_SET' || type === 'REST_PAUSE' ? parentForDrop.value : null,
  })
  entry.type = 'WORKING'
}

function recordNotPerformed() {
  emit('record', {
    setType: 'WORKING',
    status: 'NOT_PERFORMED',
    loadKg: null,
    reps: null,
    rir: null,
    restSeconds: null,
    notes: null,
    parentSetId: null,
  })
}

function openDetailed() {
  emit('detailedSet', {
    setType: entry.type,
    status: 'COMPLETED',
    loadKg: entry.load === '' ? null : displayToKg(Number(entry.load), unit.value),
    reps: entry.reps === '' ? null : Number(entry.reps),
    parentSetId:
      entry.type === 'DROP_SET' || entry.type === 'REST_PAUSE' ? parentForDrop.value : null,
  })
}

/** Numeração das séries: válidas contam 1, 2, 3…; as outras mostram o tipo. */
function setLabel(set: WorkoutSet): string {
  if (set.setType === 'WORKING') {
    const working = e.value.sets.filter((s) => s.setType === 'WORKING')
    return String(working.indexOf(set) + 1)
  }
  return setTypeShort[set.setType]
}

const expanded = ref(!substituted.value)

const statusText = computed(() =>
  props.finished && e.value.status === 'PENDING'
    ? 'Não feito'
    : exerciseStatusLabel[e.value.status],
)
</script>

<template>
  <q-card
    flat
    bordered
    class="exercise-card"
    :class="{ 'exercise-card--muted': substituted || skipped }"
  >
    <q-card-section class="q-pb-sm">
      <div class="row items-start no-wrap">
        <q-avatar size="28px" color="primary" text-color="white" class="text-weight-bold q-mr-sm">
          {{ index + 1 }}
        </q-avatar>
        <div class="col" @click="substituted && (expanded = !expanded)">
          <div class="text-subtitle1 text-weight-medium leading-tight">{{ e.exerciseName }}</div>
          <div class="text-caption text-muted">
            {{ catalog.muscleName(e.muscleGroup) }} · {{ equipmentLabel[e.equipment] }}
          </div>
        </div>
        <q-badge :color="exerciseStatusColor[e.status]" :label="statusText" class="q-ml-xs" />
        <q-btn
          v-if="!readonly && !substituted"
          flat
          round
          dense
          icon="more_vert"
          aria-label="Ações do exercício"
          :disable="busy"
          class="q-ml-xs"
        >
          <q-menu auto-close>
            <q-list style="min-width: 220px">
              <q-item clickable @click="openDetailed">
                <q-item-section avatar><q-icon name="edit_note" /></q-item-section>
                <q-item-section>Registrar série detalhada</q-item-section>
              </q-item>
              <q-item clickable @click="recordNotPerformed">
                <q-item-section avatar><q-icon name="block" /></q-item-section>
                <q-item-section>Marcar série não realizada</q-item-section>
              </q-item>
              <q-item clickable @click="emit('observation')">
                <q-item-section avatar><q-icon name="healing" /></q-item-section>
                <q-item-section>Dor ou observação</q-item-section>
              </q-item>
              <q-item clickable @click="emit('notes')">
                <q-item-section avatar><q-icon name="sticky_note_2" /></q-item-section>
                <q-item-section>Nota do exercício</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable @click="emit('substitute')">
                <q-item-section avatar><q-icon name="swap_horiz" /></q-item-section>
                <q-item-section>Substituir exercício</q-item-section>
              </q-item>
              <q-item v-if="!skipped" clickable @click="emit('skip')">
                <q-item-section avatar><q-icon name="skip_next" /></q-item-section>
                <q-item-section>Pular exercício</q-item-section>
              </q-item>
              <q-item v-else clickable @click="emit('unskip')">
                <q-item-section avatar><q-icon name="undo" /></q-item-section>
                <q-item-section>Desfazer pular</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>

      <div v-if="substituted" class="text-caption text-muted q-mt-xs">
        Substituído{{ substituteName ? ` por ${substituteName}` : '' }}
      </div>
      <template v-if="expanded">
        <div v-if="planLine" class="q-mt-xs text-body2">{{ planLine }}</div>
        <div v-if="lastLine" class="text-caption text-primary">{{ lastLine }}</div>
        <div v-if="e.notes" class="text-caption pre-line q-mt-xs">📝 {{ e.notes }}</div>
      </template>
    </q-card-section>

    <template v-if="expanded">
      <q-list v-if="e.sets.length" dense class="q-px-sm">
        <q-item
          v-for="set in e.sets"
          :key="set.id"
          :clickable="!readonly && !set.pending"
          class="set-row"
          @click="!readonly && !set.pending && emit('editSet', set)"
        >
          <q-item-section avatar class="set-row__number">
            <span
              :class="set.setType === 'WORKING' ? 'text-weight-bold' : 'text-caption text-muted'"
            >
              {{ setLabel(set) }}
            </span>
          </q-item-section>
          <q-item-section>
            <q-item-label v-if="set.status === 'COMPLETED' || set.reps != null">
              <span class="text-weight-medium">{{ displayLoad(set.loadKg) }}</span>
              <span class="text-muted">&nbsp;{{ weightLabel[unit] }} ×&nbsp;</span>
              <span class="text-weight-medium">{{ set.reps ?? '—' }}</span>
              <span v-if="set.rir != null" class="text-muted"> · RIR {{ set.rir }}</span>
            </q-item-label>
            <q-item-label v-if="set.status !== 'COMPLETED'" caption class="text-warning">
              {{ setStatusLabel[set.status] }}
            </q-item-label>
            <q-item-label v-if="set.setType !== 'WORKING'" caption>{{
              setTypeLabel[set.setType]
            }}</q-item-label>
            <q-item-label v-if="set.notes" caption class="ellipsis">{{ set.notes }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon v-if="set.pending" name="cloud_upload" color="warning" size="20px">
              <q-tooltip>Aguardando conexão para salvar</q-tooltip>
            </q-icon>
            <q-icon
              v-else-if="set.status === 'COMPLETED'"
              name="check_circle"
              color="positive"
              size="20px"
            />
            <q-icon v-else name="remove_circle_outline" color="warning" size="20px" />
          </q-item-section>
        </q-item>
      </q-list>

      <q-card-section v-if="!readonly && !substituted" class="q-pt-sm">
        <div class="row no-wrap items-center q-gutter-x-sm entry-row">
          <q-btn-dropdown
            flat
            dense
            no-caps
            :label="
              entry.type === 'WORKING' ? `Série ${doneSets.length + 1}` : setTypeLabel[entry.type]
            "
            class="entry-row__type"
            :color="entry.type === 'WORKING' ? undefined : 'warning'"
          >
            <q-list>
              <q-item
                v-for="type in typeOptions"
                :key="type"
                v-close-popup
                clickable
                :active="entry.type === type"
                :disable="(type === 'DROP_SET' || type === 'REST_PAUSE') && !parentForDrop"
                @click="entry.type = type"
              >
                <q-item-section>{{ setTypeLabel[type] }}</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
          <q-input
            v-model="entry.load"
            type="number"
            inputmode="decimal"
            step="0.5"
            min="0"
            dense
            outlined
            :suffix="weightLabel[unit]"
            class="col entry-row__input"
            aria-label="Carga"
          />
          <span class="text-muted">×</span>
          <q-input
            v-model.number="entry.reps"
            type="number"
            inputmode="numeric"
            min="0"
            dense
            outlined
            placeholder="reps"
            class="col entry-row__input"
            aria-label="Repetições"
            @keyup.enter="record"
          />
          <q-btn
            round
            unelevated
            color="positive"
            icon="check"
            size="lg"
            aria-label="Concluir série"
            :disable="!canRecord || busy"
            @click="record"
          />
        </div>
      </q-card-section>
    </template>
  </q-card>
</template>

<style scoped>
.exercise-card--muted {
  opacity: 0.6;
}
.leading-tight {
  line-height: 1.25;
}
.set-row {
  min-height: 40px;
  border-radius: 8px;
}
.set-row__number {
  min-width: 36px;
  padding-right: 4px;
}
.entry-row__type {
  min-width: 78px;
}
.entry-row__input :deep(input) {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}
</style>
