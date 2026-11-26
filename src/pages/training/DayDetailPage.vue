<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import ExercisePickerDialog from '@/components/exercise/ExercisePickerDialog.vue'
import DayFormDialog from '@/components/training/DayFormDialog.vue'
import PlannedExerciseDialog from '@/components/training/PlannedExerciseDialog.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { getErrorMessage } from '@/services/api'
import { trainingService } from '@/services/training.service'
import { useCatalogStore } from '@/stores/catalog'
import { useSettingsStore } from '@/stores/settings'
import type { Exercise } from '@/types/exercise'
import type {
  DayRequest,
  PlannedExercise,
  PlannedExerciseRequest,
  WorkoutDay,
} from '@/types/training'
import { confirmAction, openDialog } from '@/utils/dialogs'
import { dayOfWeekLabel, equipmentLabel, formatRest } from '@/utils/labels'
import { kgToDisplay, weightLabel } from '@/utils/units'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const settings = useSettingsStore()

const day = ref<WorkoutDay | null>(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)

const unit = computed(() => settings.settings?.weightUnit ?? 'KG')

usePageHeader({
  title: computed(() => day.value?.name),
  back: computed(() => (day.value ? { name: 'phase', params: { id: day.value.phaseId } } : null)),
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [loaded] = await Promise.all([
      trainingService.getDay(String(route.params.id)),
      catalog.ensureLoaded().catch(() => undefined),
    ])
    day.value = loaded
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, load, { immediate: true })

async function run(action: () => Promise<void>, success?: string) {
  busy.value = true
  try {
    await action()
    if (success) $q.notify({ type: 'positive', message: success })
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  } finally {
    busy.value = false
  }
}

function configLine(planned: PlannedExercise): string {
  const parts = [
    `${planned.sets} × ${planned.repsMin === planned.repsMax ? planned.repsMin : `${planned.repsMin}–${planned.repsMax}`}`,
  ]
  if (planned.restSeconds != null) parts.push(`descanso ${formatRest(planned.restSeconds)}`)
  if (planned.targetRir != null) parts.push(`RIR ${planned.targetRir}`)
  if (planned.suggestedLoadKg != null) {
    parts.push(`${kgToDisplay(planned.suggestedLoadKg, unit.value)} ${weightLabel[unit.value]}`)
  }
  return parts.join(' · ')
}

async function editDay() {
  const current = day.value
  if (!current) return
  const updated = await openDialog<WorkoutDay>($q, DayFormDialog, {
    day: current,
    save: (payload: DayRequest) => trainingService.updateDay(current.id, payload),
  })
  if (updated) day.value = updated
}

async function removeDay() {
  const current = day.value
  if (!current) return
  const ok = await confirmAction($q, {
    title: 'Excluir dia de treino',
    message: `"${current.name}" e os exercícios dele serão excluídos.`,
    ok: 'Excluir',
  })
  if (!ok) return
  await run(async () => {
    await trainingService.deleteDay(current.id)
    await router.replace({ name: 'phase', params: { id: current.phaseId } })
  }, 'Dia excluído')
}

async function addExercise() {
  const current = day.value
  if (!current) return
  const exercise = await openDialog<Exercise>($q, ExercisePickerDialog)
  if (!exercise) return
  const added = await openDialog<PlannedExercise>($q, PlannedExerciseDialog, {
    exerciseName: exercise.name,
    save: (payload: PlannedExerciseRequest) =>
      trainingService.addExercise(current.id, { ...payload, exerciseId: exercise.id }),
  })
  if (added) current.exercises = [...current.exercises, added]
}

async function editExercise(planned: PlannedExercise) {
  const current = day.value
  if (!current) return
  const updated = await openDialog<PlannedExercise>($q, PlannedExerciseDialog, {
    exerciseName: planned.exercise.name,
    planned,
    save: (payload: PlannedExerciseRequest) => trainingService.updateExercise(planned.id, payload),
  })
  if (updated) replaceLocal(updated)
}

async function replaceExercise(planned: PlannedExercise) {
  const exercise = await openDialog<Exercise>($q, ExercisePickerDialog, {
    title: `Substituir ${planned.exercise.name}`,
  })
  if (!exercise) return
  await run(async () => {
    replaceLocal(await trainingService.replaceExercise(planned.id, exercise.id))
  }, 'Exercício substituído; a configuração foi mantida')
}

async function removeExercise(planned: PlannedExercise) {
  const current = day.value
  if (!current) return
  const ok = await confirmAction($q, {
    title: 'Remover exercício',
    message: `Remover "${planned.exercise.name}" deste dia?`,
    ok: 'Remover',
  })
  if (!ok) return
  await run(async () => {
    await trainingService.removeExercise(planned.id)
    current.exercises = current.exercises.filter((item) => item.id !== planned.id)
  })
}

function move(index: number, offset: number) {
  const current = day.value
  if (!current) return
  const ids = current.exercises.map((planned) => planned.id)
  const target = index + offset
  if (target < 0 || target >= ids.length) return
  ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
  void run(async () => {
    day.value = await trainingService.reorderExercises(current.id, ids)
  })
}

function replaceLocal(updated: PlannedExercise) {
  if (!day.value) return
  day.value.exercises = day.value.exercises.map((item) => (item.id === updated.id ? updated : item))
}
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <q-banner v-else-if="error" rounded class="bg-negative text-white">
        {{ error }}
        <template #action><q-btn flat label="Tentar de novo" @click="load" /></template>
      </q-banner>

      <template v-else-if="day">
        <q-card flat bordered>
          <q-card-section class="row items-start no-wrap">
            <div class="col">
              <div class="text-caption text-muted">{{ day.phaseName }}</div>
              <div class="text-h6">
                <span v-if="day.dayOfWeek" class="text-primary"
                  >{{ dayOfWeekLabel[day.dayOfWeek] }} —
                </span>
                {{ day.name }}
              </div>
              <div v-if="day.notes" class="q-mt-xs pre-line">{{ day.notes }}</div>
            </div>
            <q-btn flat round dense icon="more_vert" aria-label="Ações do dia" :disable="busy">
              <q-menu auto-close>
                <q-list style="min-width: 180px">
                  <q-item clickable @click="editDay">
                    <q-item-section avatar><q-icon name="edit" /></q-item-section>
                    <q-item-section>Editar</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item clickable class="text-negative" @click="removeDay">
                    <q-item-section avatar><q-icon name="delete" /></q-item-section>
                    <q-item-section>Excluir dia</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-card-section>
        </q-card>

        <div v-if="!day.exercises.length" class="text-center text-muted q-pa-lg">
          Nenhum exercício. Adicione os exercícios na ordem de execução.
        </div>

        <q-card v-for="(planned, index) in day.exercises" :key="planned.id" flat bordered>
          <q-item class="q-py-md">
            <q-item-section avatar top>
              <q-avatar size="28px" color="primary" text-color="white" class="text-weight-bold">
                {{ index + 1 }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">
                {{ planned.exercise.name }}
                <q-badge
                  v-if="!planned.exercise.active"
                  color="grey-7"
                  label="Desativado"
                  class="q-ml-xs"
                />
              </q-item-label>
              <q-item-label caption>
                {{ catalog.muscleName(planned.exercise.primaryMuscleGroup) }} ·
                {{ equipmentLabel[planned.exercise.equipment] }}
              </q-item-label>
              <q-item-label class="q-mt-xs">{{ configLine(planned) }}</q-item-label>
              <q-item-label v-if="planned.notes" caption class="pre-line">{{
                planned.notes
              }}</q-item-label>
            </q-item-section>
            <q-item-section side top>
              <div class="row no-wrap items-center">
                <div class="column">
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    icon="keyboard_arrow_up"
                    aria-label="Mover para cima"
                    :disable="busy || index === 0"
                    @click="move(index, -1)"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    icon="keyboard_arrow_down"
                    aria-label="Mover para baixo"
                    :disable="busy || index === day.exercises.length - 1"
                    @click="move(index, 1)"
                  />
                </div>
                <q-btn
                  flat
                  round
                  dense
                  icon="more_vert"
                  aria-label="Ações do exercício"
                  :disable="busy"
                >
                  <q-menu auto-close>
                    <q-list style="min-width: 180px">
                      <q-item clickable @click="editExercise(planned)">
                        <q-item-section avatar><q-icon name="tune" /></q-item-section>
                        <q-item-section>Editar séries e reps</q-item-section>
                      </q-item>
                      <q-item clickable @click="replaceExercise(planned)">
                        <q-item-section avatar><q-icon name="swap_horiz" /></q-item-section>
                        <q-item-section>Substituir exercício</q-item-section>
                      </q-item>
                      <q-separator />
                      <q-item clickable class="text-negative" @click="removeExercise(planned)">
                        <q-item-section avatar
                          ><q-icon name="remove_circle_outline"
                        /></q-item-section>
                        <q-item-section>Remover</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>
        </q-card>

        <q-btn
          color="primary"
          unelevated
          size="lg"
          icon="add"
          label="Adicionar exercício"
          class="full-width"
          :disable="busy"
          @click="addExercise"
        />
      </template>
    </div>
  </q-page>
</template>
