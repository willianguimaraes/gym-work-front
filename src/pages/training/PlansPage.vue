<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import PlanFormDialog from '@/components/training/PlanFormDialog.vue'
import { getErrorMessage } from '@/services/api'
import { trainingService } from '@/services/training.service'
import type { Plan, PlanRequest, PlanSummary } from '@/types/training'
import { formatPeriod, goalLabel, statusColor, statusLabel } from '@/utils/labels'
import { openDialog } from '@/utils/dialogs'

const $q = useQuasar()
const router = useRouter()

const plans = ref<PlanSummary[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    plans.value = await trainingService.listPlans()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function createPlan() {
  const plan = await openDialog<Plan>($q, PlanFormDialog, {
    save: (payload: PlanRequest) => trainingService.createPlan(payload),
  })
  if (plan) await router.push({ name: 'plan', params: { id: plan.id } })
}

onMounted(load)
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

      <q-card v-else-if="!plans.length" flat bordered>
        <q-card-section class="text-center q-gutter-y-sm q-py-lg">
          <q-icon name="event_note" size="48px" color="primary" />
          <div class="text-subtitle1 text-weight-medium">Nenhum planejamento</div>
          <div class="text-muted">
            Crie um planejamento, adicione as fases e monte os dias de treino com os exercícios.
          </div>
          <q-btn
            color="primary"
            unelevated
            icon="add"
            label="Criar planejamento"
            @click="createPlan"
          />
        </q-card-section>
      </q-card>

      <template v-else>
        <q-card
          v-for="plan in plans"
          :key="plan.id"
          flat
          bordered
          class="cursor-pointer"
          @click="router.push({ name: 'plan', params: { id: plan.id } })"
        >
          <q-card-section>
            <div class="row items-start no-wrap q-gutter-sm">
              <div class="col">
                <div class="text-subtitle1 text-weight-medium">{{ plan.name }}</div>
                <div class="text-caption text-muted">
                  {{ goalLabel[plan.goal] }} · {{ plan.phasesCount }}
                  {{ plan.phasesCount === 1 ? 'fase' : 'fases' }} · {{ plan.totalWeeks }}
                  {{ plan.totalWeeks === 1 ? 'semana' : 'semanas' }}
                </div>
                <div v-if="plan.startDate" class="text-caption text-muted">
                  {{ formatPeriod(plan.startDate, plan.expectedEndDate) }}
                </div>
              </div>
              <q-badge :color="statusColor[plan.status]" :label="statusLabel[plan.status]" />
            </div>
          </q-card-section>
        </q-card>
      </template>
    </div>

    <q-page-sticky v-if="!loading && plans.length" position="bottom-right" :offset="[16, 16]">
      <q-btn fab color="primary" icon="add" aria-label="Novo planejamento" @click="createPlan" />
    </q-page-sticky>
  </q-page>
</template>
