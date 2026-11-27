<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import PhaseFormDialog from '@/components/training/PhaseFormDialog.vue'
import PlanFormDialog from '@/components/training/PlanFormDialog.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { getErrorMessage } from '@/services/api'
import { reportService } from '@/services/report.service'
import { trainingService } from '@/services/training.service'
import type { Phase, PhaseRequest, Plan, PlanRequest, PlanStatus } from '@/types/training'
import { confirmAction, openDialog } from '@/utils/dialogs'
import { saveFile } from '@/utils/files'
import { formatDate, formatPeriod, goalLabel, statusColor, statusLabel } from '@/utils/labels'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()

const plan = ref<Plan | null>(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)

usePageHeader({ title: computed(() => plan.value?.name) })

async function load() {
  loading.value = true
  error.value = ''
  try {
    plan.value = await trainingService.getPlan(String(route.params.id))
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, load, { immediate: true })

/** Próxima fase começa no dia seguinte ao fim da última (ou no início do planejamento). */
const suggestedStart = computed(() => {
  const phases = plan.value?.phases ?? []
  const lastEnd = phases.at(-1)?.endDate
  if (!lastEnd) return phases.length ? null : (plan.value?.startDate ?? null)
  const next = new Date(`${lastEnd}T12:00:00`)
  next.setDate(next.getDate() + 1)
  return next.toISOString().slice(0, 10)
})

function toRequest(current: Plan, status?: PlanStatus): PlanRequest {
  return {
    name: current.name,
    goal: current.goal,
    startDate: current.startDate,
    expectedEndDate: current.expectedEndDate,
    notes: current.notes,
    status: status ?? null,
  }
}

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
  const current = plan.value
  if (!current) return
  const updated = await openDialog<Plan>($q, PlanFormDialog, {
    plan: current,
    save: (payload: PlanRequest) => trainingService.updatePlan(current.id, payload),
  })
  if (updated) plan.value = updated
}

function activate() {
  const current = plan.value
  if (!current) return
  void run(async () => {
    plan.value = await trainingService.activatePlan(current.id)
  }, 'Planejamento ativado')
}

function setStatus(status: PlanStatus) {
  const current = plan.value
  if (!current) return
  void run(async () => {
    plan.value = await trainingService.updatePlan(current.id, toRequest(current, status))
  }, `Marcado como ${statusLabel[status].toLowerCase()}`)
}

/** Baixa o planejamento no template gymwork.plan/v1 (o mesmo da importação). */
async function exportTemplate() {
  if (!plan.value) return
  try {
    saveFile(await reportService.planTemplate(plan.value.id))
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  }
}

function duplicate() {
  const current = plan.value
  if (!current) return
  void run(async () => {
    const copy = await trainingService.duplicatePlan(current.id)
    await router.push({ name: 'plan', params: { id: copy.id } })
  }, 'Cópia criada como rascunho')
}

async function remove() {
  const current = plan.value
  if (!current) return
  const ok = await confirmAction($q, {
    title: 'Excluir planejamento',
    message: `"${current.name}" e todas as fases, semanas, dias e exercícios serão excluídos.`,
    ok: 'Excluir',
  })
  if (!ok) return
  await run(async () => {
    await trainingService.deletePlan(current.id)
    await router.replace({ name: 'plans' })
  }, 'Planejamento excluído')
}

async function addPhase() {
  const current = plan.value
  if (!current) return
  const phase = await openDialog<Phase>($q, PhaseFormDialog, {
    suggestedStart: suggestedStart.value,
    save: (payload: PhaseRequest) => trainingService.createPhase(current.id, payload),
  })
  if (phase) await router.push({ name: 'phase', params: { id: phase.id } })
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

      <template v-else-if="plan">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-start no-wrap">
              <div class="col">
                <q-badge :color="statusColor[plan.status]" :label="statusLabel[plan.status]" />
                <div class="text-h6 q-mt-xs">{{ plan.name }}</div>
                <div class="text-muted">
                  {{ goalLabel[plan.goal] }} · {{ plan.totalWeeks }}
                  {{ plan.totalWeeks === 1 ? 'semana' : 'semanas' }}
                </div>
                <div v-if="plan.startDate" class="text-caption text-muted">
                  {{ formatPeriod(plan.startDate, plan.expectedEndDate) }}
                </div>
                <div v-else-if="plan.expectedEndDate" class="text-caption text-muted">
                  Término previsto em {{ formatDate(plan.expectedEndDate) }}
                </div>
              </div>
              <q-btn
                flat
                round
                dense
                icon="more_vert"
                aria-label="Ações do planejamento"
                :disable="busy"
              >
                <q-menu auto-close>
                  <q-list style="min-width: 200px">
                    <q-item clickable @click="edit">
                      <q-item-section avatar><q-icon name="edit" /></q-item-section>
                      <q-item-section>Editar</q-item-section>
                    </q-item>
                    <q-item clickable @click="duplicate">
                      <q-item-section avatar><q-icon name="content_copy" /></q-item-section>
                      <q-item-section>Duplicar</q-item-section>
                    </q-item>
                    <q-item clickable @click="exportTemplate">
                      <q-item-section avatar><q-icon name="schema" /></q-item-section>
                      <q-item-section>Exportar (JSON)</q-item-section>
                    </q-item>
                    <q-item clickable :to="{ name: 'plan-import', query: { planId: plan.id } }">
                      <q-item-section avatar><q-icon name="upload_file" /></q-item-section>
                      <q-item-section>Importar fases (JSON)</q-item-section>
                    </q-item>
                    <q-item
                      v-if="plan.status !== 'COMPLETED'"
                      clickable
                      @click="setStatus('COMPLETED')"
                    >
                      <q-item-section avatar><q-icon name="task_alt" /></q-item-section>
                      <q-item-section>Marcar como concluído</q-item-section>
                    </q-item>
                    <q-item
                      v-if="plan.status !== 'ARCHIVED'"
                      clickable
                      @click="setStatus('ARCHIVED')"
                    >
                      <q-item-section avatar><q-icon name="archive" /></q-item-section>
                      <q-item-section>Arquivar</q-item-section>
                    </q-item>
                    <q-item v-if="plan.status !== 'DRAFT'" clickable @click="setStatus('DRAFT')">
                      <q-item-section avatar><q-icon name="edit_note" /></q-item-section>
                      <q-item-section>Voltar para rascunho</q-item-section>
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
            <div v-if="plan.notes" class="q-mt-sm pre-line">{{ plan.notes }}</div>
          </q-card-section>
          <q-card-actions v-if="plan.status !== 'ACTIVE'" class="q-px-md q-pb-md">
            <q-btn
              color="primary"
              unelevated
              icon="play_arrow"
              label="Tornar ativo"
              class="full-width"
              :loading="busy"
              @click="activate"
            />
          </q-card-actions>
        </q-card>

        <div class="row items-center justify-between">
          <div class="text-subtitle1 text-weight-medium">Fases</div>
          <q-btn
            flat
            dense
            no-caps
            color="primary"
            icon="add"
            label="Nova fase"
            @click="addPhase"
          />
        </div>

        <div v-if="!plan.phases.length" class="text-center text-muted q-pa-lg">
          Nenhuma fase ainda. Uma fase tem a duração em semanas e os dias de treino.
        </div>

        <q-list v-else bordered separator class="rounded-borders">
          <q-item
            v-for="(phase, index) in plan.phases"
            :key="phase.id"
            clickable
            :to="{ name: 'phase', params: { id: phase.id } }"
          >
            <q-item-section avatar>
              <q-avatar size="32px" color="primary" text-color="white">{{ index + 1 }}</q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ phase.name }}</q-item-label>
              <q-item-label caption>
                {{ phase.weeksCount }} {{ phase.weeksCount === 1 ? 'semana' : 'semanas' }} ·
                {{ phase.daysCount }} {{ phase.daysCount === 1 ? 'dia' : 'dias' }} de treino
              </q-item-label>
              <q-item-label v-if="phase.startDate" caption>
                {{ formatPeriod(phase.startDate, phase.endDate) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side><q-icon name="chevron_right" /></q-item-section>
          </q-item>
        </q-list>
      </template>
    </div>
  </q-page>
</template>
