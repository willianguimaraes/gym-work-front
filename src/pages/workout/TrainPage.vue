<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import axios from 'axios'
import { getErrorMessage, isNetworkError } from '@/services/api'
import { workoutService } from '@/services/workout.service'
import { useWorkoutStore } from '@/stores/workout'
import type { ProblemDetail } from '@/types/auth'
import type { StartOptions } from '@/types/workout'
import { dayOfWeekLabel, formatDuration, formatShortDate } from '@/utils/labels'

/** Tela "Treinar": retomar a sessão em andamento ou escolher o dia de treino de hoje. */
const $q = useQuasar()
const router = useRouter()
const workout = useWorkoutStore()

const data = ref<StartOptions | null>(null)
const loading = ref(true)
const error = ref('')
const starting = ref<string | null>(null)

const todayWeekday = computed(() => {
  if (!data.value) return null
  const [y, m, d] = data.value.today.split('-').map(Number)
  const jsDay = new Date(y!, m! - 1, d!).getDay()
  return ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][jsDay]
})

async function load(phaseId?: string | null) {
  loading.value = true
  error.value = ''
  try {
    data.value = await workoutService.startOptions(phaseId)
  } catch (e) {
    const cached = isNetworkError(e) ? workout.cachedSession() : null
    if (cached) {
      await router.replace({ name: 'session', params: { id: cached.id } })
      return
    }
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function start(dayId: string | null) {
  starting.value = dayId ?? 'free'
  try {
    const session = await workoutService.start(dayId, dayId ? (data.value?.week?.id ?? null) : null)
    await router.push({ name: 'session', params: { id: session.id } })
  } catch (e) {
    const existing = axios.isAxiosError<ProblemDetail & { sessionId?: string }>(e)
      ? e.response?.data?.sessionId
      : undefined
    if (existing) {
      $q.notify({ type: 'info', message: 'Você já tem um treino em andamento' })
      await router.push({ name: 'session', params: { id: existing } })
    } else {
      $q.notify({ type: 'negative', message: getErrorMessage(e) })
    }
  } finally {
    starting.value = null
  }
}

onMounted(() => load())
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <q-banner v-else-if="error" rounded class="bg-negative text-white">
        {{ error }}
        <template #action><q-btn flat label="Tentar de novo" @click="load()" /></template>
      </q-banner>

      <template v-else-if="data">
        <q-card v-if="data.current" flat bordered class="current-card">
          <q-card-section>
            <div class="text-overline text-primary">Treino em andamento</div>
            <div class="text-h6">{{ data.current.dayName ?? 'Treino avulso' }}</div>
            <div class="text-muted">
              Começou há {{ formatDuration(data.current.startedAt, null) }} ·
              {{ data.current.completedSets }}
              {{ data.current.completedSets === 1 ? 'série feita' : 'séries feitas' }}
            </div>
          </q-card-section>
          <q-card-actions class="q-px-md q-pb-md">
            <q-btn
              color="primary"
              unelevated
              size="lg"
              icon="play_arrow"
              label="Continuar treino"
              class="full-width"
              :to="{ name: 'session', params: { id: data.current.id } }"
            />
          </q-card-actions>
        </q-card>

        <template v-else>
          <template v-if="data.plan && data.phase">
            <div>
              <div class="text-caption text-muted">{{ data.plan.name }}</div>
              <div class="row items-center no-wrap">
                <div class="text-h6 col ellipsis">{{ data.phase.name }}</div>
                <q-btn
                  v-if="data.phases.length > 1"
                  flat
                  dense
                  no-caps
                  icon-right="expand_more"
                  label="Fase"
                >
                  <q-menu auto-close>
                    <q-list>
                      <q-item
                        v-for="phase in data.phases"
                        :key="phase.id"
                        clickable
                        :active="phase.id === data.phase.id"
                        @click="load(phase.id)"
                      >
                        <q-item-section>{{ phase.name }}</q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </div>
              <div class="text-muted">
                <template v-if="data.week">
                  Semana {{ data.week.weekNumber }}
                  <q-badge
                    v-if="data.week.deload"
                    color="warning"
                    text-color="black"
                    label="Deload"
                  />
                </template>
                <template v-else>Fora das datas da fase</template>
              </div>
            </div>

            <div v-if="!data.days.length" class="text-center text-muted q-pa-lg">
              Esta fase ainda não tem dias de treino.
            </div>

            <q-card
              v-for="day in data.days"
              :key="day.id"
              flat
              bordered
              :class="{ 'today-card': day.dayOfWeek === todayWeekday }"
            >
              <q-item class="q-py-md">
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    <span v-if="day.dayOfWeek" class="text-primary">
                      {{ dayOfWeekLabel[day.dayOfWeek] }} —
                    </span>
                    {{ day.name }}
                    <q-badge
                      v-if="day.dayOfWeek === todayWeekday"
                      color="primary"
                      label="Hoje"
                      class="q-ml-xs"
                    />
                  </q-item-label>
                  <q-item-label caption>
                    {{ day.exercisesCount }}
                    {{ day.exercisesCount === 1 ? 'exercício' : 'exercícios' }} ·
                    {{
                      day.lastPerformedAt
                        ? `feito em ${formatShortDate(day.lastPerformedAt)}`
                        : 'ainda não feito'
                    }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    color="primary"
                    unelevated
                    icon="play_arrow"
                    label="Iniciar"
                    :loading="starting === day.id"
                    :disable="!!starting"
                    @click="start(day.id)"
                  />
                </q-item-section>
              </q-item>
            </q-card>
          </template>

          <q-card v-else flat bordered>
            <q-card-section class="text-center q-gutter-y-sm">
              <q-icon name="event_note" size="40px" color="primary" />
              <div class="text-subtitle1 text-weight-medium">
                {{ data.plan ? 'O planejamento ativo não tem fases' : 'Nenhum planejamento ativo' }}
              </div>
              <div class="text-muted">
                Ative um planejamento para começar pelos dias de treino, ou faça um treino avulso.
              </div>
              <q-btn
                flat
                color="primary"
                no-caps
                label="Ver planejamentos"
                :to="{ name: 'plans' }"
              />
            </q-card-section>
          </q-card>

          <q-btn
            outline
            color="primary"
            icon="add"
            label="Treino avulso"
            class="full-width"
            :loading="starting === 'free'"
            :disable="!!starting"
            @click="start(null)"
          />
        </template>
      </template>
    </div>
  </q-page>
</template>

<style scoped>
.today-card,
.current-card {
  border-color: var(--q-primary);
}
</style>
