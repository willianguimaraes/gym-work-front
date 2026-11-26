<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { trainingService } from '@/services/training.service'
import { workoutService } from '@/services/workout.service'
import type { PlanSummary } from '@/types/training'
import type { SessionSummary } from '@/types/workout'
import { formatDateTime, formatDuration, formatPeriod, goalLabel } from '@/utils/labels'

const auth = useAuthStore()
const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')

const plans = ref<PlanSummary[] | null>(null)
const activePlan = computed(() => plans.value?.find((plan) => plan.status === 'ACTIVE') ?? null)
const lastSession = ref<SessionSummary | null>(null)

onMounted(async () => {
  const [plansResult, historyResult] = await Promise.allSettled([
    trainingService.listPlans(),
    workoutService.history(0, 1),
  ])
  plans.value = plansResult.status === 'fulfilled' ? plansResult.value : []
  lastSession.value =
    historyResult.status === 'fulfilled' ? (historyResult.value.content[0] ?? null) : null
})
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <div class="text-h6">Olá, {{ firstName }} 👋</div>

      <q-skeleton v-if="plans === null" type="rect" height="96px" class="rounded-borders" />

      <q-card v-else-if="activePlan" flat bordered>
        <q-item clickable :to="{ name: 'plan', params: { id: activePlan.id } }" class="q-py-md">
          <q-item-section avatar
            ><q-icon name="event_note" color="primary" size="32px"
          /></q-item-section>
          <q-item-section>
            <q-item-label caption>Planejamento ativo</q-item-label>
            <q-item-label class="text-subtitle1 text-weight-medium">{{
              activePlan.name
            }}</q-item-label>
            <q-item-label caption>
              {{ goalLabel[activePlan.goal] }} · {{ activePlan.phasesCount }}
              {{ activePlan.phasesCount === 1 ? 'fase' : 'fases' }} · {{ activePlan.totalWeeks }}
              {{ activePlan.totalWeeks === 1 ? 'semana' : 'semanas' }}
            </q-item-label>
            <q-item-label v-if="activePlan.startDate" caption>
              {{ formatPeriod(activePlan.startDate, activePlan.expectedEndDate) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>
      </q-card>

      <q-card v-else flat bordered>
        <q-card-section class="row items-center no-wrap q-gutter-md">
          <q-icon name="event_note" size="40px" color="primary" />
          <div class="col">
            <div class="text-subtitle1 text-weight-medium">Nenhum planejamento ativo</div>
            <div class="text-caption text-muted">
              {{
                plans.length
                  ? 'Ative um dos seus planejamentos.'
                  : 'Monte seu primeiro planejamento de treino.'
              }}
            </div>
          </div>
        </q-card-section>
        <q-card-actions class="q-px-md q-pb-md">
          <q-btn
            color="primary"
            unelevated
            no-caps
            :label="plans.length ? 'Ver planejamentos' : 'Criar planejamento'"
            :to="{ name: 'plans' }"
            class="full-width"
          />
        </q-card-actions>
      </q-card>

      <q-btn
        color="primary"
        unelevated
        size="lg"
        icon="play_arrow"
        :label="lastSession?.status === 'IN_PROGRESS' ? 'Continuar treino' : 'Treinar'"
        class="full-width"
        :to="{ name: 'train' }"
      />

      <q-card v-if="lastSession" flat bordered>
        <q-item clickable :to="{ name: 'session', params: { id: lastSession.id } }" class="q-py-md">
          <q-item-section avatar>
            <q-icon name="fitness_center" color="primary" size="32px" />
          </q-item-section>
          <q-item-section>
            <q-item-label caption>
              {{ lastSession.status === 'IN_PROGRESS' ? 'Treino em andamento' : 'Último treino' }}
            </q-item-label>
            <q-item-label class="text-subtitle1 text-weight-medium">
              {{ lastSession.dayName ?? 'Treino avulso' }}
            </q-item-label>
            <q-item-label caption>
              {{ formatDateTime(lastSession.startedAt) }} ·
              {{ formatDuration(lastSession.startedAt, lastSession.finishedAt) }} ·
              {{ lastSession.completedSets }}
              {{ lastSession.completedSets === 1 ? 'série' : 'séries' }}
            </q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>
      </q-card>
    </div>
  </q-page>
</template>
