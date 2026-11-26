<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ChartConfiguration } from 'chart.js'
import ChartCanvas from '@/components/charts/ChartCanvas.vue'
import AnalysisCard from '@/components/progression/AnalysisCard.vue'
import { getErrorMessage } from '@/services/api'
import { progressionService } from '@/services/progression.service'
import { trainingService } from '@/services/training.service'
import { useCatalogStore } from '@/stores/catalog'
import type { ProgressionReport, Trend, VolumeReport } from '@/types/progression'
import { equipmentLabel, formatShortDate, trendColor, trendIcon, trendLabel } from '@/utils/labels'

/** Evolução geral: análise de progressão por exercício, volume por grupo muscular e frequência. */
const catalog = useCatalogStore()

const report = ref<ProgressionReport | null>(null)
const volume = ref<VolumeReport | null>(null)
const scope = ref<string>('weeks:8')
const scopeOptions = ref<{ value: string; label: string }[]>([
  { value: 'weeks:4', label: 'Últimas 4 semanas' },
  { value: 'weeks:8', label: 'Últimas 8 semanas' },
  { value: 'weeks:12', label: 'Últimas 12 semanas' },
])
const loading = ref(true)
const error = ref('')

const ORDER: Trend[] = ['PROGRESSING', 'STABLE', 'REGRESSING', 'INCOMPLETE', 'INSUFFICIENT_DATA']

const groups = computed(() =>
  ORDER.map((trend) => ({
    trend,
    items: report.value?.items.filter((item) => item.analysis.trend === trend) ?? [],
  })).filter((group) => group.items.length),
)

async function loadReport() {
  const [kind, value] = scope.value.split(':')
  report.value = await progressionService.report(
    kind === 'phase' ? { phaseId: value } : { weeks: Number(value) },
  )
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await catalog.ensureLoaded().catch(() => undefined)
    const plans = await trainingService.listPlans()
    const active = plans.find((plan) => plan.status === 'ACTIVE')
    if (active) {
      const plan = await trainingService.getPlan(active.id)
      scopeOptions.value = [
        ...scopeOptions.value.filter((option) => option.value.startsWith('weeks')),
        ...plan.phases.map((phase) => ({
          value: `phase:${phase.id}`,
          label: `Fase: ${phase.name}`,
        })),
      ]
    }
    const [, volumeReport] = await Promise.all([loadReport(), progressionService.volume(8)])
    volume.value = volumeReport
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(scope, async () => {
  try {
    await loadReport()
  } catch (e) {
    error.value = getErrorMessage(e)
  }
})

const muscleChart = computed<ChartConfiguration>(() => {
  const totals = volume.value?.totals ?? []
  return {
    type: 'bar',
    data: {
      labels: totals.map((m) => catalog.muscleName(m.muscleGroup)),
      datasets: [
        {
          label: 'Séries (principal)',
          data: totals.map((m) => m.sets),
          backgroundColor: '#3b82f6',
          borderRadius: 4,
        },
        {
          label: 'Séries (secundário)',
          data: totals.map((m) => m.secondarySets),
          backgroundColor: 'rgba(59,130,246,0.35)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  }
})

const weeklyChart = computed<ChartConfiguration>(() => {
  const weeks = volume.value?.weeks ?? []
  return {
    type: 'bar',
    data: {
      labels: weeks.map((w) => formatShortDate(`${w.weekStart}T12:00:00`)),
      datasets: [
        {
          label: 'Treinos',
          data: weeks.map((w) => w.sessions),
          backgroundColor: '#22c55e',
          borderRadius: 4,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Séries válidas',
          data: weeks.map((w) => w.validSets),
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          tension: 0.25,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } },
      },
    },
  } as ChartConfiguration
})

const muscleChartHeight = computed(() =>
  Math.max(160, (volume.value?.totals.length ?? 0) * 34 + 60),
)

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

      <template v-else-if="report">
        <q-select
          v-model="scope"
          :options="scopeOptions"
          emit-value
          map-options
          outlined
          dense
          label="Período"
        />

        <div class="row q-gutter-xs">
          <q-chip
            v-for="trend in ORDER"
            :key="trend"
            dense
            :color="report.counts[trend] ? trendColor[trend] : undefined"
            :text-color="report.counts[trend] ? 'white' : undefined"
            :outline="!report.counts[trend]"
            :icon="trendIcon[trend]"
          >
            {{ trendLabel[trend] }}: {{ report.counts[trend] ?? 0 }}
          </q-chip>
        </div>

        <div v-if="!report.items.length" class="text-center text-muted q-pa-lg">
          Nenhum treino finalizado neste período.
        </div>

        <div v-for="group in groups" :key="group.trend">
          <div class="text-subtitle1 text-weight-medium q-mb-sm">
            <q-icon :name="trendIcon[group.trend]" :color="trendColor[group.trend]" />
            {{ trendLabel[group.trend] }}
          </div>
          <q-list bordered separator class="rounded-borders">
            <q-item
              v-for="item in group.items"
              :key="item.exerciseId"
              clickable
              :to="{ name: 'exercise', params: { id: item.exerciseId } }"
            >
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ item.exerciseName }}</q-item-label>
                <q-item-label caption>
                  {{ catalog.muscleName(item.muscleGroup) }} ·
                  {{ equipmentLabel[item.equipment] }} · {{ item.executions }}
                  {{ item.executions === 1 ? 'execução' : 'execuções' }} · última
                  {{ formatShortDate(item.lastPerformedAt) }}
                </q-item-label>
                <div class="q-mt-xs">
                  <AnalysisCard :analysis="item.analysis" compact />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <q-card v-if="volume" flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium">Frequência e séries por semana</div>
            <div class="text-caption text-muted q-mb-sm">Últimas 8 semanas</div>
            <ChartCanvas :config="weeklyChart" :height="220" />
          </q-card-section>
        </q-card>

        <q-card v-if="volume" flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium">Séries por grupo muscular</div>
            <div class="text-caption text-muted q-mb-sm">
              Últimas 8 semanas. Séries válidas (sem aquecimento e ativação); o grupo secundário é
              contado à parte.
            </div>
            <ChartCanvas
              v-if="volume.totals.length"
              :config="muscleChart"
              :height="muscleChartHeight"
            />
            <div v-else class="text-caption text-muted text-center q-pa-md">
              Sem séries no período.
            </div>
          </q-card-section>
        </q-card>

        <div class="text-caption text-muted text-center">
          As sugestões são informativas e não mudam o seu plano. Nenhuma análise substitui
          orientação profissional.
        </div>
      </template>
    </div>
  </q-page>
</template>
