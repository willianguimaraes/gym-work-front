<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import DayFormDialog from '@/components/training/DayFormDialog.vue'
import PhaseFormDialog from '@/components/training/PhaseFormDialog.vue'
import WeekDialog from '@/components/training/WeekDialog.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { getErrorMessage } from '@/services/api'
import { trainingService } from '@/services/training.service'
import type { DayRequest, Phase, PhaseRequest, Week, WorkoutDay } from '@/types/training'
import { confirmAction, openDialog } from '@/utils/dialogs'
import { dayOfWeekLabel, formatPeriod } from '@/utils/labels'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()

const phase = ref<Phase | null>(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)

usePageHeader({
  title: computed(() => phase.value?.name),
  back: computed(() => (phase.value ? { name: 'plan', params: { id: phase.value.planId } } : null)),
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    phase.value = await trainingService.getPhase(String(route.params.id))
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, load, { immediate: true })

const deloadWeeks = computed(() => phase.value?.weeks.filter((week) => week.deload).length ?? 0)

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

async function edit() {
  const current = phase.value
  if (!current) return
  const updated = await openDialog<Phase>($q, PhaseFormDialog, {
    phase: current,
    save: (payload: PhaseRequest) => trainingService.updatePhase(current.id, payload),
  })
  if (updated) phase.value = updated
}

function duplicate() {
  const current = phase.value
  if (!current) return
  void run(async () => {
    const copy = await trainingService.duplicatePhase(current.id)
    await router.push({ name: 'phase', params: { id: copy.id } })
  }, 'Nova fase criada a partir desta')
}

async function remove() {
  const current = phase.value
  if (!current) return
  const ok = await confirmAction($q, {
    title: 'Excluir fase',
    message: `"${current.name}" e todos os dias e exercícios dela serão excluídos.`,
    ok: 'Excluir',
  })
  if (!ok) return
  await run(async () => {
    await trainingService.deletePhase(current.id)
    await router.replace({ name: 'plan', params: { id: current.planId } })
  }, 'Fase excluída')
}

async function editWeek(week: Week) {
  const updated = await openDialog<Week>($q, WeekDialog, {
    week,
    save: (payload: { deload: boolean; notes: string | null }) =>
      trainingService.updateWeek(week.id, payload),
  })
  if (updated && phase.value) {
    phase.value.weeks = phase.value.weeks.map((w) => (w.id === updated.id ? updated : w))
  }
}

async function addDay() {
  const current = phase.value
  if (!current) return
  const day = await openDialog<WorkoutDay>($q, DayFormDialog, {
    save: (payload: DayRequest) => trainingService.createDay(current.id, payload),
  })
  if (day) await router.push({ name: 'day', params: { id: day.id } })
}

function move(index: number, offset: number) {
  const current = phase.value
  if (!current) return
  const ids = current.days.map((day) => day.id)
  const target = index + offset
  if (target < 0 || target >= ids.length) return
  ;[ids[index], ids[target]] = [ids[target]!, ids[index]!]
  void run(async () => {
    phase.value = await trainingService.reorderDays(current.id, ids)
  })
}

function exerciseSummary(day: WorkoutDay): string {
  if (!day.exercises.length) return 'Nenhum exercício'
  const names = day.exercises.slice(0, 3).map((planned) => planned.exercise.name)
  const more = day.exercises.length - names.length
  return names.join(', ') + (more > 0 ? ` e mais ${more}` : '')
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

      <template v-else-if="phase">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-start no-wrap">
              <div class="col">
                <div class="text-caption text-muted">
                  {{ phase.planName }} · Fase {{ phase.position + 1 }}
                </div>
                <div class="text-h6">{{ phase.name }}</div>
                <div class="text-muted">
                  {{ phase.weeksCount }} {{ phase.weeksCount === 1 ? 'semana' : 'semanas' }}
                  <template v-if="deloadWeeks">· {{ deloadWeeks }} de deload</template>
                </div>
                <div v-if="phase.startDate" class="text-caption text-muted">
                  {{ formatPeriod(phase.startDate, phase.endDate) }}
                </div>
              </div>
              <q-btn flat round dense icon="more_vert" aria-label="Ações da fase" :disable="busy">
                <q-menu auto-close>
                  <q-list style="min-width: 200px">
                    <q-item clickable @click="edit">
                      <q-item-section avatar><q-icon name="edit" /></q-item-section>
                      <q-item-section>Editar</q-item-section>
                    </q-item>
                    <q-item clickable @click="duplicate">
                      <q-item-section avatar><q-icon name="content_copy" /></q-item-section>
                      <q-item-section>Criar nova fase a partir desta</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable class="text-negative" @click="remove">
                      <q-item-section avatar><q-icon name="delete" /></q-item-section>
                      <q-item-section>Excluir</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
            <div v-if="phase.notes" class="q-mt-sm pre-line">{{ phase.notes }}</div>
          </q-card-section>
        </q-card>

        <div>
          <div class="text-subtitle1 text-weight-medium q-mb-xs">Semanas</div>
          <div class="text-caption text-muted q-mb-sm">
            Toque numa semana para marcar deload ou anotar algo.
          </div>
          <div class="row q-gutter-xs">
            <q-chip
              v-for="week in phase.weeks"
              :key="week.id"
              clickable
              :color="week.deload ? 'warning' : undefined"
              :text-color="week.deload ? 'black' : undefined"
              :outline="!week.deload"
              :icon="week.notes ? 'sticky_note_2' : undefined"
              @click="editWeek(week)"
            >
              S{{ week.weekNumber }}
            </q-chip>
          </div>
        </div>

        <div class="row items-center justify-between">
          <div class="text-subtitle1 text-weight-medium">Dias de treino</div>
          <q-btn flat dense no-caps color="primary" icon="add" label="Novo dia" @click="addDay" />
        </div>

        <div v-if="!phase.days.length" class="text-center text-muted q-pa-lg">
          Nenhum dia ainda. Ex.: SEGUNDA — UPPER, TERÇA — LOWER A…
        </div>

        <q-card v-for="(day, index) in phase.days" :key="day.id" flat bordered>
          <q-item clickable :to="{ name: 'day', params: { id: day.id } }" class="q-py-md">
            <q-item-section>
              <q-item-label class="text-weight-medium">
                <span v-if="day.dayOfWeek" class="text-primary"
                  >{{ dayOfWeekLabel[day.dayOfWeek] }} —
                </span>
                {{ day.name }}
              </q-item-label>
              <q-item-label caption>
                {{ day.exercises.length }}
                {{ day.exercises.length === 1 ? 'exercício' : 'exercícios' }}
              </q-item-label>
              <q-item-label caption lines="2">{{ exerciseSummary(day) }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="column">
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  icon="keyboard_arrow_up"
                  aria-label="Mover para cima"
                  :disable="busy || index === 0"
                  @click.stop.prevent="move(index, -1)"
                />
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  icon="keyboard_arrow_down"
                  aria-label="Mover para baixo"
                  :disable="busy || index === phase.days.length - 1"
                  @click.stop.prevent="move(index, 1)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-card>
      </template>
    </div>
  </q-page>
</template>
