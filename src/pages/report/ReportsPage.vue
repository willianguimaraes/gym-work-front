<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { getErrorMessage } from '@/services/api'
import { reportService } from '@/services/report.service'
import { trainingService } from '@/services/training.service'
import type { Plan, PlanSummary, Week } from '@/types/training'
import { formatDate } from '@/utils/labels'
import { saveFile } from '@/utils/files'

/** Relatórios: escolhe o planejamento e abre o relatório da fase, de uma semana ou o pacote para IA. */
const $q = useQuasar()

const plans = ref<PlanSummary[]>([])
const planId = ref<string | null>(null)
const plan = ref<Plan | null>(null)
const weeks = ref<Record<string, Week[]>>({})
const loading = ref(true)
const error = ref('')
const exporting = ref(false)

function todayIso() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
const today = todayIso()

const planOptions = computed(() => plans.value.map((p) => ({ value: p.id, label: p.name })))

async function load() {
  loading.value = true
  error.value = ''
  try {
    plans.value = await trainingService.listPlans()
    planId.value = plans.value.find((p) => p.status === 'ACTIVE')?.id ?? plans.value[0]?.id ?? null
    if (planId.value) await loadPlan(planId.value)
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function loadPlan(id: string) {
  plan.value = await trainingService.getPlan(id)
  weeks.value = {}
}

watch(planId, async (id, previous) => {
  if (!id || !previous || id === previous) return
  try {
    await loadPlan(id)
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  }
})

/** Semanas da fase, carregadas ao abrir; só as que já começaram. */
async function openPhase(phaseId: string) {
  if (weeks.value[phaseId]) return
  try {
    const phase = await trainingService.getPhase(phaseId)
    weeks.value = {
      ...weeks.value,
      [phaseId]: phase.weeks.filter((w) => w.startDate != null && w.startDate <= today),
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  }
}

async function exportPlan() {
  if (!planId.value) return
  exporting.value = true
  try {
    saveFile(await reportService.planTemplate(planId.value))
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  } finally {
    exporting.value = false
  }
}

onMounted(load)
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md q-pb-xl">
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>
      <q-banner v-else-if="error" rounded class="bg-negative text-white">
        {{ error }}
        <template #action><q-btn flat label="Tentar de novo" @click="load" /></template>
      </q-banner>

      <template v-else>
        <div class="text-body2 text-muted">
          O relatório da sessão fica no próprio treino (Histórico). Aqui estão os da semana e da
          fase, e o pacote para mandar à IA no fim da fase.
        </div>

        <div v-if="!plans.length" class="text-center q-pa-lg">
          <q-icon name="description" size="48px" color="grey-6" />
          <div class="text-subtitle1 q-mt-sm">Nenhum planejamento</div>
          <div class="text-muted">
            Os relatórios de semana e fase usam as fases do planejamento.
          </div>
          <q-btn
            flat
            no-caps
            color="primary"
            label="Ir para planejamentos"
            :to="{ name: 'plans' }"
            class="q-mt-sm"
          />
        </div>

        <template v-else>
          <div class="row items-center q-col-gutter-sm no-wrap">
            <div class="col">
              <q-select
                v-model="planId"
                :options="planOptions"
                emit-value
                map-options
                outlined
                dense
                label="Planejamento"
              />
            </div>
            <div>
              <q-btn
                flat
                round
                color="primary"
                icon="schema"
                :loading="exporting"
                aria-label="Exportar planejamento (JSON)"
                @click="exportPlan"
              >
                <q-tooltip>Exportar planejamento (JSON)</q-tooltip>
              </q-btn>
            </div>
          </div>

          <div v-if="plan && !plan.phases.length" class="text-center text-muted q-pa-md">
            Este planejamento ainda não tem fases.
          </div>

          <q-list v-if="plan" bordered separator class="rounded-borders">
            <q-expansion-item
              v-for="phase in plan.phases"
              :key="phase.id"
              :label="phase.name"
              :caption="
                phase.startDate
                  ? `${formatDate(phase.startDate)} a ${formatDate(phase.endDate)} · ${phase.weeksCount} semanas`
                  : `${phase.weeksCount} semanas · sem data de início`
              "
              icon="layers"
              @show="openPhase(phase.id)"
            >
              <div class="q-px-md q-pb-md q-gutter-y-sm">
                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <q-btn
                      color="primary"
                      unelevated
                      no-caps
                      icon="description"
                      label="Fase completa"
                      class="full-width"
                      :to="{ name: 'report', params: { scope: 'fase', id: phase.id } }"
                    />
                  </div>
                  <div class="col-6">
                    <q-btn
                      outline
                      color="primary"
                      no-caps
                      icon="smart_toy"
                      label="Pacote para IA"
                      class="full-width"
                      :to="{
                        name: 'report',
                        params: { scope: 'fase', id: phase.id },
                        query: { tab: 'ai' },
                      }"
                    />
                  </div>
                </div>
                <div class="text-caption text-muted">Semanas</div>
                <div v-if="!weeks[phase.id]" class="text-caption text-muted">Carregando…</div>
                <div v-else-if="!weeks[phase.id]!.length" class="text-caption text-muted">
                  {{
                    phase.startDate
                      ? 'Nenhuma semana começou ainda.'
                      : 'Defina a data de início da fase para separar as semanas.'
                  }}
                </div>
                <div v-else class="row q-gutter-xs">
                  <q-chip
                    v-for="week in weeks[phase.id]"
                    :key="week.id"
                    clickable
                    outline
                    color="primary"
                    :icon="week.deload ? 'battery_charging_full' : undefined"
                    :label="`Semana ${week.weekNumber}`"
                    @click="
                      $router.push({ name: 'report', params: { scope: 'semana', id: week.id } })
                    "
                  />
                </div>
              </div>
            </q-expansion-item>
          </q-list>
        </template>
      </template>
    </div>
  </q-page>
</template>
