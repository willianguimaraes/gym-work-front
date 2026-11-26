<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import type { ChartConfiguration } from 'chart.js'
import ChartCanvas from '@/components/charts/ChartCanvas.vue'
import AnalysisCard from '@/components/progression/AnalysisCard.vue'
import RuleDialog from '@/components/progression/RuleDialog.vue'
import { getErrorMessage } from '@/services/api'
import { progressionService } from '@/services/progression.service'
import { useSettingsStore } from '@/stores/settings'
import type {
  ExerciseHistoryItem,
  ExerciseSummary,
  GroupBy,
  ProgressionRule,
  ProgressPoint,
} from '@/types/progression'
import { openDialog } from '@/utils/dialogs'
import {
  bodyRegionLabel,
  categoryIcon,
  categoryLabel,
  formatDateTime,
  formatShortDate,
} from '@/utils/labels'
import { kgToDisplay, weightLabel } from '@/utils/units'

/** Evolução de um exercício: resumo, análise, gráfico, histórico por sessão e observações. */
const props = defineProps<{ exerciseId: string; exerciseName: string }>()

const $q = useQuasar()
const settings = useSettingsStore()
const unit = computed(() => settings.settings?.weightUnit ?? 'KG')

const summary = ref<ExerciseSummary | null>(null)
const points = ref<ProgressPoint[]>([])
const groupBy = ref<GroupBy>('SESSION')
const history = ref<ExerciseHistoryItem[]>([])
const historyPage = ref(0)
const historyTotal = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')

const groupOptions = [
  { value: 'SESSION', label: 'Sessão' },
  { value: 'WEEK', label: 'Semana' },
  { value: 'PHASE', label: 'Fase' },
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [s, p, h] = await Promise.all([
      progressionService.summary(props.exerciseId),
      progressionService.progress(props.exerciseId, groupBy.value),
      progressionService.history(props.exerciseId, 0),
    ])
    summary.value = s
    points.value = p
    history.value = h.content
    historyPage.value = 0
    historyTotal.value = h.totalElements
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(groupBy, async (value) => {
  try {
    points.value = await progressionService.progress(props.exerciseId, value)
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  }
})

async function moreHistory() {
  loadingMore.value = true
  try {
    const page = await progressionService.history(props.exerciseId, historyPage.value + 1)
    history.value = [...history.value, ...page.content]
    historyPage.value = page.page
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  } finally {
    loadingMore.value = false
  }
}

async function editRule() {
  if (!summary.value) return
  const updated = await openDialog<ProgressionRule>($q, RuleDialog, {
    exerciseName: props.exerciseName,
    rule: summary.value.rule,
  })
  if (updated) {
    $q.notify({ type: 'positive', message: 'Regra salva', timeout: 1500 })
    await load()
  }
}

function load_(kg: number | null | undefined): string {
  return kg == null ? '—' : `${kgToDisplay(kg, unit.value)} ${weightLabel[unit.value]}`
}

/** Troca "kg" pela unidade do usuário nos resumos vindos da API ("45 kg — 8/7/6"). */
function inUnit(text: string | null | undefined): string {
  if (!text || unit.value === 'KG') return text ?? ''
  return text.replace(/(\d+(?:,\d+)?) kg/g, (_, kg: string) => load_(Number(kg.replace(',', '.'))))
}

const chartConfig = computed<ChartConfiguration>(() => ({
  type: 'line',
  data: {
    labels: points.value.map((p) => p.label),
    datasets: [
      {
        label: `Carga (${weightLabel[unit.value]})`,
        data: points.value.map((p) => kgToDisplay(p.topLoadKg, unit.value)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.15)',
        yAxisID: 'y',
        tension: 0.25,
        fill: true,
        pointRadius: 4,
      },
      {
        label: 'Reps (média na maior carga)',
        data: points.value.map((p) => p.repsAtTopLoad),
        borderColor: '#22c55e',
        backgroundColor: '#22c55e',
        yAxisID: 'y1',
        tension: 0.25,
        pointRadius: 4,
        borderDash: [6, 4],
      },
    ],
  },
  options: {
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
    scales: {
      y: { position: 'left', beginAtZero: false, title: { display: false, text: '' } },
      y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } },
    },
  },
}))

onMounted(load)
</script>

<template>
  <div class="q-gutter-y-md">
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner size="40px" color="primary" />
    </div>

    <q-banner v-else-if="error" rounded class="bg-negative text-white">
      {{ error }}
      <template #action><q-btn flat label="Tentar de novo" @click="load" /></template>
    </q-banner>

    <template v-else-if="summary">
      <div v-if="!summary.executions" class="text-center text-muted q-pa-lg">
        <q-icon name="insights" size="40px" />
        <div>Este exercício ainda não aparece em treinos finalizados.</div>
      </div>

      <template v-else>
        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-card flat bordered class="stat">
              <div class="text-caption text-muted">
                Última ({{ formatShortDate(summary.lastPerformedAt) }})
              </div>
              <div class="text-subtitle1 text-weight-bold">{{ inUnit(summary.lastSummary) }}</div>
            </q-card>
          </div>
          <div class="col-6">
            <q-card flat bordered class="stat">
              <div class="text-caption text-muted">Melhor série</div>
              <div class="text-subtitle1 text-weight-bold">
                <template v-if="summary.bestSet">
                  {{ load_(summary.bestSet.loadKg) }} × {{ summary.bestSet.reps }}
                </template>
                <template v-else>—</template>
              </div>
              <div v-if="summary.bestSet" class="text-caption text-muted">
                {{ formatShortDate(summary.bestSet.performedAt) }}
              </div>
            </q-card>
          </div>
          <div class="col-6">
            <q-card flat bordered class="stat">
              <div class="text-caption text-muted">1RM estimado (máx.)</div>
              <div class="text-subtitle1 text-weight-bold">
                {{ load_(summary.bestEstimatedOneRepMaxKg) }}
              </div>
              <div class="text-caption text-muted">só como referência</div>
            </q-card>
          </div>
          <div class="col-6">
            <q-card flat bordered class="stat">
              <div class="text-caption text-muted">Execuções</div>
              <div class="text-subtitle1 text-weight-bold">{{ summary.executions }}</div>
            </q-card>
          </div>
        </div>

        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center no-wrap q-mb-sm">
              <div class="text-subtitle1 text-weight-medium col">Progressão</div>
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                icon="tune"
                :label="summary.rule.custom ? 'Regra ajustada' : 'Regra padrão'"
                @click="editRule"
              />
            </div>
            <AnalysisCard :analysis="summary.analysis" />
          </q-card-section>
        </q-card>

        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center no-wrap q-mb-sm">
              <div class="text-subtitle1 text-weight-medium col">Carga e repetições</div>
              <q-btn-toggle
                v-model="groupBy"
                :options="groupOptions"
                dense
                no-caps
                unelevated
                toggle-color="primary"
                size="sm"
              />
            </div>
            <ChartCanvas v-if="points.length > 1" :config="chartConfig" />
            <div v-else class="text-caption text-muted q-pa-md text-center">
              O gráfico aparece a partir de dois pontos.
            </div>
          </q-card-section>
        </q-card>

        <div>
          <div class="text-subtitle1 text-weight-medium q-mb-sm">Histórico</div>
          <q-list bordered separator class="rounded-borders">
            <q-item
              v-for="item in history"
              :key="item.sessionId"
              clickable
              :to="{ name: 'session', params: { id: item.sessionId } }"
            >
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ inUnit(item.summary) }}</q-item-label>
                <q-item-label caption>
                  {{ formatDateTime(item.performedAt) }}
                  <template v-if="item.dayName"> · {{ item.dayName }}</template>
                  <template v-if="item.weekNumber"> · Sem. {{ item.weekNumber }}</template>
                </q-item-label>
                <q-item-label v-if="item.repsMax" caption>
                  Planejado: {{ item.plannedSets }} × {{ item.repsMin }}–{{ item.repsMax }}
                </q-item-label>
              </q-item-section>
              <q-item-section side class="row no-wrap items-center q-gutter-x-xs">
                <q-badge v-if="item.deload" color="warning" text-color="black" label="Deload" />
                <q-badge v-if="!item.complete" color="grey-7" label="Incompleto" />
                <q-icon v-if="item.painReported" name="healing" color="negative" size="20px" />
              </q-item-section>
            </q-item>
          </q-list>
          <div class="flex flex-center q-pt-sm">
            <q-btn
              v-if="history.length < historyTotal"
              flat
              no-caps
              color="primary"
              :loading="loadingMore"
              :label="`Carregar mais (${historyTotal - history.length})`"
              @click="moreHistory"
            />
          </div>
        </div>
      </template>

      <div v-if="summary.observations.length">
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Observações</div>
        <q-list bordered separator class="rounded-borders">
          <q-item v-for="o in summary.observations" :key="o.id">
            <q-item-section avatar>
              <q-icon
                :name="categoryIcon[o.category]"
                :color="o.category === 'PAIN' ? 'negative' : 'primary'"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>
                {{ categoryLabel[o.category] }}
                <template v-if="o.bodyRegion"> · {{ bodyRegionLabel[o.bodyRegion] }}</template>
                <template v-if="o.intensity != null"> · {{ o.intensity }}/10</template>
              </q-item-label>
              <q-item-label caption>{{ formatDateTime(o.observedAt) }}</q-item-label>
              <q-item-label v-if="o.text" caption class="pre-line">{{ o.text }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stat {
  padding: 10px 12px;
  height: 100%;
}
</style>
