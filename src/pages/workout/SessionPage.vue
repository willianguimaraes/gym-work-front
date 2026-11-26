<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import ExercisePickerDialog from '@/components/exercise/ExercisePickerDialog.vue'
import ObservationDialog from '@/components/workout/ObservationDialog.vue'
import RestTimerBar from '@/components/workout/RestTimerBar.vue'
import SessionExerciseCard from '@/components/workout/SessionExerciseCard.vue'
import SetEditDialog from '@/components/workout/SetEditDialog.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useRestTimer } from '@/composables/useRestTimer'
import { getErrorMessage } from '@/services/api'
import { workoutService } from '@/services/workout.service'
import { useCatalogStore } from '@/stores/catalog'
import { useSettingsStore } from '@/stores/settings'
import { useWorkoutStore } from '@/stores/workout'
import type { Exercise } from '@/types/exercise'
import type {
  Observation,
  ObservationCategory,
  ObservationRequest,
  SessionExercise,
  SetRequest,
  WorkoutSet,
} from '@/types/workout'
import { confirmAction, openDialog } from '@/utils/dialogs'
import {
  bodyRegionLabel,
  bodySideLabel,
  categoryIcon,
  categoryLabel,
  formatDateTime,
  formatDuration,
} from '@/utils/labels'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const store = useWorkoutStore()
const catalog = useCatalogStore()
const settings = useSettingsStore()
const timer = useRestTimer()

const loading = ref(true)
const error = ref('')
const busy = ref(false)
const editing = ref(false)
const now = ref(Date.now())
const clock = setInterval(() => (now.value = Date.now()), 30_000)
onUnmounted(() => clearInterval(clock))

const session = computed(() => store.session)
const inProgress = computed(() => session.value?.status === 'IN_PROGRESS')
const readonly = computed(() => !inProgress.value && !editing.value)
const pending = computed(() => (session.value ? store.pendingCount(session.value.id) : 0))
const progress = computed(() => {
  const s = session.value
  if (!s || !s.plannedSets) return 0
  return Math.min(1, s.completedSets / s.plannedSets)
})
const elapsed = computed(() => {
  void now.value
  return session.value ? formatDuration(session.value.startedAt, session.value.finishedAt) : ''
})

usePageHeader({
  title: computed(() => (session.value ? (session.value.dayName ?? 'Treino avulso') : null)),
  back: computed(() =>
    inProgress.value || !session.value ? { name: 'train' } : { name: 'history' },
  ),
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([
      store.load(String(route.params.id)),
      catalog.ensureLoaded().catch(() => undefined),
    ])
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(() => route.params.id, load, { immediate: true })

// séries recusadas pela API ao sincronizar a fila
watch(
  () => store.failures.length,
  (count) => {
    if (!count) return
    for (const message of store.failures.splice(0)) {
      $q.notify({ type: 'negative', message: `Série não salva: ${message}` })
    }
  },
)

async function run(action: () => Promise<void>, success?: string) {
  busy.value = true
  try {
    await action()
    if (success) $q.notify({ type: 'positive', message: success, timeout: 1500 })
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  } finally {
    busy.value = false
  }
}

function restFor(exercise: SessionExercise, payload: SetRequest) {
  if (!inProgress.value || payload.status !== 'COMPLETED') return
  if (payload.setType === 'DROP_SET' || payload.setType === 'REST_PAUSE') return
  const base = exercise.restSeconds ?? settings.settings?.defaultRestSeconds ?? 90
  const seconds =
    payload.setType === 'WARMUP' || payload.setType === 'ACTIVATION' ? Math.min(base, 60) : base
  timer.start(seconds, exercise.exerciseName, {
    sound: settings.settings?.restSoundEnabled ?? true,
  })
}

async function record(exercise: SessionExercise, payload: SetRequest) {
  restFor(exercise, payload)
  const message = await store.addSet(exercise, payload)
  if (message) $q.notify({ type: 'negative', message })
  else if (store.offline) {
    $q.notify({
      type: 'warning',
      message: 'Sem conexão: a série ficou salva no aparelho',
      timeout: 1500,
    })
  }
}

async function detailedSet(exercise: SessionExercise, initial: Partial<SetRequest>) {
  await openDialog($q, SetEditDialog, {
    title: `Nova série · ${exercise.exerciseName}`,
    initial,
    save: async (payload: SetRequest) => {
      const message = await store.addSet(exercise, payload)
      if (message) throw new Error(message)
      restFor(exercise, payload)
    },
  })
}

async function editSet(exercise: SessionExercise, set: WorkoutSet) {
  await openDialog($q, SetEditDialog, {
    title: `Corrigir série · ${exercise.exerciseName}`,
    set,
    save: async (payload: SetRequest) =>
      store.replaceExercise(await workoutService.updateSet(set.id, payload)),
    remove: async () => store.replaceExercise(await workoutService.deleteSet(set.id)),
  })
}

function skip(exercise: SessionExercise) {
  void run(async () => store.replaceExercise(await workoutService.skip(exercise.id)))
}

function unskip(exercise: SessionExercise) {
  void run(async () => store.replaceExercise(await workoutService.unskip(exercise.id)))
}

async function substitute(exercise: SessionExercise) {
  const chosen = await openDialog<Exercise>($q, ExercisePickerDialog, {
    title: `Substituir ${exercise.exerciseName}`,
  })
  if (!chosen) return
  await run(async () => {
    store.setSession(await workoutService.substitute(exercise.id, chosen.id))
  }, 'Exercício substituído')
}

async function addExercise() {
  const current = session.value
  if (!current) return
  const chosen = await openDialog<Exercise>($q, ExercisePickerDialog, {
    title: 'Adicionar exercício',
  })
  if (!chosen) return
  await run(async () => {
    const added = await workoutService.addExercise(current.id, chosen.id)
    current.exercises.push(added)
  })
}

async function exerciseNotes(exercise: SessionExercise) {
  $q.dialog({
    title: 'Nota do exercício',
    prompt: { model: exercise.notes ?? '', type: 'textarea', outlined: true, autogrow: true },
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Salvar', color: 'primary', unelevated: true },
  }).onOk((notes: string) => {
    void run(async () =>
      store.replaceExercise(await workoutService.updateExerciseNotes(exercise.id, notes || null)),
    )
  })
}

async function addObservation(exercise?: SessionExercise) {
  const current = session.value
  if (!current) return
  const categories: ObservationCategory[] | undefined = exercise
    ? ['PAIN', 'DISCOMFORT', 'EXECUTION_DIFFICULTY', 'EQUIPMENT_UNAVAILABLE', 'GENERAL']
    : ['ENERGY', 'SLEEP', 'RECOVERY', 'PAIN', 'DISCOMFORT', 'GENERAL']
  const created = await openDialog<Observation>($q, ObservationDialog, {
    exerciseName: exercise?.exerciseName ?? null,
    categories,
    save: (payload: ObservationRequest) =>
      workoutService.createObservation({
        ...payload,
        sessionId: current.id,
        sessionExerciseId: exercise?.id ?? null,
      }),
  })
  if (created) {
    current.observations.push(created)
    $q.notify({ type: 'positive', message: 'Observação registrada', timeout: 1500 })
  }
}

async function editObservation(observation: Observation) {
  const current = session.value
  if (!current) return
  const exercise = current.exercises.find((x) => x.id === observation.sessionExerciseId)
  const updated = await openDialog<Observation>($q, ObservationDialog, {
    exerciseName: exercise?.exerciseName ?? null,
    observation,
    save: (payload: ObservationRequest) =>
      workoutService.updateObservation(observation.id, {
        ...payload,
        sessionId: current.id,
        sessionExerciseId: observation.sessionExerciseId,
      }),
  })
  if (updated) {
    current.observations = current.observations.map((o) => (o.id === updated.id ? updated : o))
  }
}

function observationTitle(observation: Observation): string {
  const parts: string[] = [categoryLabel[observation.category]]
  if (observation.bodyRegion) parts.push(bodyRegionLabel[observation.bodyRegion])
  if (observation.bodySide) parts.push(bodySideLabel[observation.bodySide].toLowerCase())
  if (observation.intensity != null) parts.push(`${observation.intensity}/10`)
  return parts.join(' · ')
}

function exerciseName(id: string | null): string | null {
  return session.value?.exercises.find((x) => x.id === id)?.exerciseName ?? null
}

function finish() {
  const current = session.value
  if (!current) return
  const missing = current.exercises.filter(
    (x) => x.status === 'PENDING' || x.status === 'PARTIAL',
  ).length
  const warnings = [
    missing
      ? `${missing} ${missing === 1 ? 'exercício ficou' : 'exercícios ficaram'} incompleto(s); o que não foi registrado fica como não feito.`
      : '',
    pending.value
      ? `${pending.value} série(s) ainda aguardam conexão e serão enviadas depois.`
      : '',
  ].filter(Boolean)
  $q.dialog({
    title: 'Finalizar treino',
    message: warnings.join(' ') || 'Tudo registrado. Quer anotar algo sobre o treino?',
    prompt: {
      model: current.notes ?? '',
      type: 'textarea',
      outlined: true,
      autogrow: true,
      label: 'Observações (opcional)',
    },
    cancel: { label: 'Continuar treinando', flat: true },
    ok: { label: 'Finalizar', color: 'primary', unelevated: true },
  }).onOk((notes: string) => {
    void run(async () => {
      store.setSession(await workoutService.finish(current.id, notes || null))
      timer.stop()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 'Treino finalizado 💪')
  })
}

async function discard() {
  const current = session.value
  if (!current) return
  const ok = await confirmAction($q, {
    title: inProgress.value ? 'Descartar treino' : 'Excluir treino',
    message:
      'Todas as séries e observações deste treino serão apagadas. Essa ação não pode ser desfeita.',
    ok: inProgress.value ? 'Descartar' : 'Excluir',
  })
  if (!ok) return
  await run(async () => {
    await workoutService.discard(current.id)
    if (inProgress.value) timer.stop()
    store.clear()
    await router.replace({ name: inProgress.value ? 'train' : 'history' })
  }, 'Treino apagado')
}
</script>

<template>
  <q-page padding :class="{ 'with-timer': timer.running.value }">
    <div class="page-container q-gutter-y-md">
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <q-banner v-else-if="error" rounded class="bg-negative text-white">
        {{ error }}
        <template #action><q-btn flat label="Tentar de novo" @click="load" /></template>
      </q-banner>

      <template v-else-if="session">
        <q-card flat bordered>
          <q-card-section class="q-pb-sm">
            <div class="row items-start no-wrap">
              <div class="col">
                <div v-if="session.planName" class="text-caption text-muted ellipsis">
                  {{ session.planName }} · {{ session.phaseName }}
                  <template v-if="session.weekNumber"> · Semana {{ session.weekNumber }}</template>
                </div>
                <div class="text-h6">{{ session.dayName ?? 'Treino avulso' }}</div>
                <div class="text-muted">
                  <template v-if="inProgress">
                    <q-icon name="schedule" /> {{ elapsed }} de treino
                  </template>
                  <template v-else>
                    {{ formatDateTime(session.startedAt) }} · {{ elapsed }}
                  </template>
                  <q-badge
                    v-if="session.deloadWeek"
                    color="warning"
                    text-color="black"
                    label="Deload"
                    class="q-ml-xs"
                  />
                </div>
              </div>
              <q-badge v-if="!inProgress" color="positive" label="Finalizado" />
              <q-btn flat round dense icon="more_vert" aria-label="Ações do treino" :disable="busy">
                <q-menu auto-close>
                  <q-list style="min-width: 220px">
                    <q-item v-if="inProgress || editing" clickable @click="addExercise">
                      <q-item-section avatar><q-icon name="add" /></q-item-section>
                      <q-item-section>Adicionar exercício</q-item-section>
                    </q-item>
                    <q-item clickable @click="addObservation()">
                      <q-item-section avatar><q-icon name="note_add" /></q-item-section>
                      <q-item-section>Observação (sono, energia…)</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      :to="{ name: 'report', params: { scope: 'sessao', id: session.id } }"
                    >
                      <q-item-section avatar><q-icon name="description" /></q-item-section>
                      <q-item-section>Relatório (copiar ou exportar)</q-item-section>
                    </q-item>
                    <q-item v-if="!inProgress" clickable @click="editing = !editing">
                      <q-item-section avatar
                        ><q-icon :name="editing ? 'done' : 'edit'"
                      /></q-item-section>
                      <q-item-section>{{
                        editing ? 'Concluir correções' : 'Corrigir séries'
                      }}</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable class="text-negative" @click="discard">
                      <q-item-section avatar><q-icon name="delete" /></q-item-section>
                      <q-item-section>{{
                        inProgress ? 'Descartar treino' : 'Excluir treino'
                      }}</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="row items-center justify-between text-caption q-mb-xs">
              <span>
                <strong>{{ session.completedSets }}</strong>
                <template v-if="session.plannedSets"> de {{ session.plannedSets }}</template>
                {{ session.completedSets === 1 && !session.plannedSets ? 'série' : 'séries' }}
              </span>
              <span v-if="pending" class="text-warning">
                <q-icon name="cloud_upload" /> {{ pending }} aguardando conexão
              </span>
              <span v-else-if="store.syncing" class="text-muted">Salvando…</span>
            </div>
            <q-linear-progress :value="progress" color="positive" rounded size="8px" />
          </q-card-section>
          <q-card-section v-if="session.notes" class="q-pt-none pre-line">
            {{ session.notes }}
          </q-card-section>
        </q-card>

        <q-banner v-if="store.offline" rounded class="bg-warning text-black">
          <template #avatar><q-icon name="cloud_off" /></template>
          Sem conexão. As séries ficam salvas no aparelho e são enviadas quando a internet voltar.
        </q-banner>

        <div v-if="!session.exercises.length" class="text-center text-muted q-pa-lg">
          Nenhum exercício ainda. Adicione o primeiro.
        </div>

        <SessionExerciseCard
          v-for="(exercise, index) in session.exercises"
          :key="exercise.id"
          :exercise="exercise"
          :index="index"
          :readonly="readonly"
          :busy="busy"
          :substitute-name="exerciseName(exercise.substitutedById)"
          :finished="!inProgress"
          @record="record(exercise, $event)"
          @detailed-set="detailedSet(exercise, $event)"
          @edit-set="editSet(exercise, $event)"
          @skip="skip(exercise)"
          @unskip="unskip(exercise)"
          @substitute="substitute(exercise)"
          @observation="addObservation(exercise)"
          @notes="exerciseNotes(exercise)"
        />

        <q-btn
          v-if="inProgress || editing"
          flat
          color="primary"
          icon="add"
          label="Adicionar exercício"
          class="full-width"
          :disable="busy"
          @click="addExercise"
        />

        <div v-if="session.observations.length">
          <div class="text-subtitle1 text-weight-medium q-mb-sm">Observações</div>
          <q-list bordered separator class="rounded-borders">
            <q-item
              v-for="observation in session.observations"
              :key="observation.id"
              clickable
              @click="editObservation(observation)"
            >
              <q-item-section avatar>
                <q-icon
                  :name="categoryIcon[observation.category]"
                  :color="observation.category === 'PAIN' ? 'negative' : 'primary'"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ observationTitle(observation) }}</q-item-label>
                <q-item-label v-if="exerciseName(observation.sessionExerciseId)" caption>
                  {{ exerciseName(observation.sessionExerciseId) }}
                  <template v-if="observation.interrupted"> · interrompeu o exercício</template>
                </q-item-label>
                <q-item-label v-if="observation.text" caption class="pre-line">
                  {{ observation.text }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <q-btn
          v-if="inProgress"
          color="primary"
          unelevated
          size="lg"
          icon="flag"
          label="Finalizar treino"
          class="full-width q-mt-lg"
          :loading="busy"
          @click="finish"
        />
      </template>
    </div>

    <RestTimerBar v-if="inProgress" />
  </q-page>
</template>

<style scoped>
.with-timer {
  padding-bottom: 96px;
}
</style>
