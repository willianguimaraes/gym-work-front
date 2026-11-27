<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import type { ChartConfiguration } from 'chart.js'
import ChartCanvas from '@/components/charts/ChartCanvas.vue'
import BodyChartCard from '@/components/dashboard/BodyChartCard.vue'
import LoadChartCard from '@/components/dashboard/LoadChartCard.vue'
import { getErrorMessage, isNetworkError } from '@/services/api'
import { dashboardService } from '@/services/dashboard.service'
import { workoutService } from '@/services/workout.service'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useSettingsStore } from '@/stores/settings'
import { useWorkoutStore } from '@/stores/workout'
import type { ProblemDetail } from '@/types/auth'
import type { Dashboard, DashboardExercise } from '@/types/dashboard'
import type { Trend } from '@/types/progression'
import {
  bodyRegionLabel,
  categoryIcon,
  categoryLabel,
  dayOfWeekLabel,
  formatDate,
  formatDateTime,
  formatDuration,
  formatShortDate,
  goalLabel,
  trendColor,
  trendIcon,
} from '@/utils/labels'
import { kgToDisplay, weightLabel } from '@/utils/units'

/**
 * Tela inicial (dashboard): o treino de hoje primeiro, depois indicadores rápidos e gráficos. Os
 * dados vêm de uma chamada só (`/api/dashboard`); o gráfico de carga busca o exercício escolhido.
 */
const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const catalog = useCatalogStore()
const settings = useSettingsStore()
const workout = useWorkoutStore()
const weightUnit = computed(() => settings.settings?.weightUnit ?? 'KG')
const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')

const data = ref<Dashboard | null>(null)
const loading = ref(true)
const error = ref('')
/** Sem internet: o treino em andamento salvo no aparelho, para retomar. */
const offlineSession = ref<ReturnType<typeof workout.cachedSession>>(null)
const starting = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [dashboard] = await Promise.all([
      dashboardService.get(),
      catalog.ensureLoaded().catch(() => undefined),
    ])
    data.value = dashboard
    offlineSession.value = null
  } catch (e) {
    error.value = getErrorMessage(e)
    offlineSession.value = isNetworkError(e) ? workout.cachedSession() : null
  } finally {
    loading.value = false
  }
}
onMounted(load)
// a conexão voltou depois de abrir o app sem internet: recarrega os dados
watch(
  () => auth.offline,
  (offline, wasOffline) => {
    if (wasOffline && !offline) void load()
  },
)

const nextLabel = computed(() => {
  const next = data.value?.next
  if (!next) return ''
  if (next.reason === 'TODAY') return 'Hoje'
  if (next.reason === 'SCHEDULED' && next.dayOfWeek && next.date)
    return `${dayOfWeekLabel[next.dayOfWeek]}, ${formatDate(next.date).slice(0, 5)}`
  return 'Próximo da sequência'
})

async function startNext() {
  const next = data.value?.next
  if (!next) return
  starting.value = true
  try {
    const session = await workoutService.start(next.dayId, data.value?.week?.id ?? null)
    await router.push({ name: 'session', params: { id: session.id } })
  } catch (e) {
    const existing = axios.isAxiosError<ProblemDetail & { sessionId?: string }>(e)
      ? e.response?.data?.sessionId
      : undefined
    if (existing) await router.push({ name: 'session', params: { id: existing } })
    else $q.notify({ type: 'negative', message: getErrorMessage(e) })
  } finally {
    starting.value = false
  }
}

const weight = computed(() => {
  const body = data.value?.body
  if (body?.latestWeightKg == null) return null
  const current = kgToDisplay(body.latestWeightKg, weightUnit.value)
  const diff =
    body.previousWeightKg == null
      ? null
      : Math.round((current - kgToDisplay(body.previousWeightKg, weightUnit.value)) * 10) / 10
  return { value: current, diff }
})

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${String(value).replace('.', ',')}`
}

const TRENDS: { trend: Trend; key: 'progressing' | 'stable' | 'regressing'; title: string }[] = [
  { trend: 'PROGRESSING', key: 'progressing', title: 'Em progresso' },
  { trend: 'STABLE', key: 'stable', title: 'Estáveis' },
  { trend: 'REGRESSING', key: 'regressing', title: 'Em queda' },
]
const trendTab = ref<'progressing' | 'stable' | 'regressing'>('progressing')
const trendItems = computed<DashboardExercise[]>(
  () => data.value?.progression[trendTab.value] ?? [],
)
const hasTrends = computed(() =>
  TRENDS.some((t) => (data.value?.progression.counts[t.trend] ?? 0) > 0),
)

const frequencyChart = computed<ChartConfiguration>(() => {
  const weeks = data.value?.frequency.weeks ?? []
  const planned = data.value?.frequency.plannedPerWeek ?? 0
  return {
    type: 'bar',
    data: {
      labels: weeks.map((w) => formatShortDate(`${w.weekStart}T12:00:00`)),
      datasets: [
        {
          label: 'Treinos',
          data: weeks.map((w) => w.sessions),
          backgroundColor: weeks.map((w) =>
            planned && w.sessions >= planned ? '#22c55e' : 'rgba(34,197,94,0.5)',
          ),
          borderRadius: 4,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 }, suggestedMax: planned || 3 } },
    },
  }
})
const anyFrequency = computed(() => data.value?.frequency.weeks.some((w) => w.sessions > 0))

const muscleChart = computed<ChartConfiguration>(() => {
  const muscles = data.value?.muscles ?? []
  return {
    type: 'bar',
    data: {
      labels: muscles.map((m) => catalog.muscleName(m.muscleGroup)),
      datasets: [
        {
          label: 'Principal',
          data: muscles.map((m) => m.sets),
          backgroundColor: '#3b82f6',
          borderRadius: 4,
        },
        {
          label: 'Secundário',
          data: muscles.map((m) => m.secondarySets),
          backgroundColor: 'rgba(59,130,246,0.35)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } },
      scales: {
        x: { beginAtZero: true, stacked: true, ticks: { precision: 0 } },
        y: { stacked: true },
      },
    },
  }
})
const muscleChartHeight = computed(() => Math.max(140, (data.value?.muscles.length ?? 0) * 26 + 60))

function observationText(o: Dashboard['recentObservations'][number]): string {
  const parts: string[] = []
  if (o.bodyRegion) parts.push(bodyRegionLabel[o.bodyRegion])
  if (o.intensity != null) parts.push(`intensidade ${o.intensity}`)
  if (o.text) parts.push(o.text)
  return parts.join(' · ')
}
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md q-pb-xl">
      <div class="text-h6">Olá, {{ firstName }} 👋</div>

      <template v-if="loading">
        <q-skeleton type="rect" height="132px" class="rounded-borders" />
        <div class="row q-col-gutter-sm">
          <div v-for="i in 3" :key="i" class="col-4">
            <q-skeleton type="rect" height="72px" class="rounded-borders" />
          </div>
        </div>
        <q-skeleton type="rect" height="200px" class="rounded-borders" />
      </template>

      <template v-else-if="error">
        <q-card v-if="offlineSession" flat bordered>
          <q-card-section>
            <div class="text-caption text-primary text-weight-medium">
              Treino em andamento (salvo no aparelho)
            </div>
            <div class="text-h6">{{ offlineSession.dayName ?? 'Treino avulso' }}</div>
            <q-btn
              color="primary"
              unelevated
              size="lg"
              icon="play_arrow"
              label="Continuar treino"
              class="full-width q-mt-md"
              :to="{ name: 'session', params: { id: offlineSession.id } }"
            />
          </q-card-section>
        </q-card>
        <q-banner
          rounded
          :class="
            offlineSession || auth.offline ? 'bg-grey-8 text-white' : 'bg-negative text-white'
          "
        >
          {{ error }}
          <template #action><q-btn flat label="Tentar de novo" @click="load" /></template>
        </q-banner>
      </template>

      <template v-else-if="data">
        <!-- Hoje: treino em andamento, próximo treino ou convite para planejar -->
        <q-card flat bordered class="today-card">
          <q-card-section v-if="data.current">
            <div class="text-caption text-primary text-weight-medium">Treino em andamento</div>
            <div class="text-h6">{{ data.current.dayName ?? 'Treino avulso' }}</div>
            <div class="text-caption text-muted">
              Começou {{ formatDateTime(data.current.startedAt) }} ·
              {{ data.current.completedSets }}
              {{ data.current.completedSets === 1 ? 'série' : 'séries' }}
            </div>
            <q-btn
              color="primary"
              unelevated
              size="lg"
              icon="play_arrow"
              label="Continuar treino"
              class="full-width q-mt-md"
              :to="{ name: 'session', params: { id: data.current.id } }"
            />
          </q-card-section>

          <q-card-section v-else-if="data.next">
            <div class="text-caption text-primary text-weight-medium">
              Próximo treino · {{ nextLabel }}
            </div>
            <div class="text-h6">{{ data.next.name }}</div>
            <div class="text-caption text-muted">
              {{ data.next.exercisesCount }}
              {{ data.next.exercisesCount === 1 ? 'exercício' : 'exercícios' }}
              <template v-if="data.next.lastPerformedAt">
                · feito por último em {{ formatShortDate(data.next.lastPerformedAt) }}
              </template>
            </div>
            <div class="row q-col-gutter-sm q-mt-sm">
              <div class="col-8">
                <q-btn
                  color="primary"
                  unelevated
                  size="lg"
                  icon="play_arrow"
                  no-caps
                  label="Começar"
                  class="full-width"
                  :loading="starting"
                  @click="startNext"
                />
              </div>
              <div class="col-4">
                <q-btn
                  outline
                  color="primary"
                  size="lg"
                  label="Outro"
                  no-caps
                  class="full-width"
                  :to="{ name: 'train' }"
                />
              </div>
            </div>
          </q-card-section>

          <q-card-section v-else class="row items-center no-wrap q-gutter-md">
            <q-icon name="event_note" size="40px" color="primary" />
            <div class="col">
              <div class="text-subtitle1 text-weight-medium">
                {{ data.plan ? 'Fase sem dias de treino' : 'Nenhum planejamento ativo' }}
              </div>
              <div class="text-caption text-muted">
                {{
                  data.plan
                    ? 'Monte os dias da fase para o app sugerir o próximo treino.'
                    : 'Monte ou ative um planejamento, ou faça um treino avulso.'
                }}
              </div>
            </div>
          </q-card-section>
          <q-card-actions v-if="!data.current && !data.next" class="q-px-md q-pb-md">
            <q-btn
              color="primary"
              unelevated
              no-caps
              label="Planejamentos"
              class="col"
              :to="data.plan ? { name: 'plan', params: { id: data.plan.id } } : { name: 'plans' }"
            />
            <q-btn
              outline
              color="primary"
              no-caps
              label="Treino avulso"
              class="col"
              :to="{ name: 'train' }"
            />
          </q-card-actions>

          <template v-if="data.plan">
            <q-separator />
            <q-item
              clickable
              dense
              :to="{ name: 'plan', params: { id: data.plan.id } }"
              class="q-py-sm"
            >
              <q-item-section>
                <q-item-label caption class="ellipsis">
                  {{ data.plan.name }} · {{ goalLabel[data.plan.goal] }}
                </q-item-label>
                <q-item-label v-if="data.phase" class="text-body2 ellipsis">
                  {{ data.phase.name }}
                  <template v-if="data.week">
                    · Semana {{ data.week.number }} de {{ data.phase.weeksCount }}
                  </template>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center no-wrap">
                  <q-badge
                    v-if="data.week?.deload"
                    color="warning"
                    text-color="black"
                    label="Deload"
                    class="q-mr-xs"
                  />
                  <q-icon name="chevron_right" />
                </div>
              </q-item-section>
            </q-item>
          </template>
        </q-card>

        <!-- Indicadores -->
        <div class="row q-col-gutter-sm">
          <div class="col-4">
            <q-card flat bordered class="tile">
              <div class="tile-label">Semana</div>
              <div class="tile-value">
                {{ data.frequency.thisWeek
                }}<span v-if="data.frequency.plannedPerWeek" class="tile-unit"
                  >/{{ data.frequency.plannedPerWeek }}</span
                >
              </div>
              <div class="tile-label">treinos</div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card
              flat
              bordered
              class="tile cursor-pointer"
              @click="router.push({ name: 'assessments' })"
            >
              <div class="tile-label">Peso</div>
              <template v-if="weight">
                <div class="tile-value">
                  {{ String(weight.value).replace('.', ',')
                  }}<span class="tile-unit">&nbsp;{{ weightLabel[weightUnit] }}</span>
                </div>
                <div class="tile-label">
                  <template v-if="weight.diff != null"
                    >{{ signed(weight.diff) }} {{ weightLabel[weightUnit] }}</template
                  >
                  <template v-else>{{
                    formatDate(data.body?.latestWeightOn).slice(0, 5)
                  }}</template>
                </div>
              </template>
              <template v-else>
                <div class="tile-value text-muted">—</div>
                <div class="tile-label">registrar</div>
              </template>
            </q-card>
          </div>
          <div class="col-4">
            <q-card
              flat
              bordered
              class="tile cursor-pointer"
              @click="router.push({ name: 'progression' })"
            >
              <div class="tile-label">Evolução</div>
              <div class="row justify-center items-center no-wrap q-gutter-x-xs tile-trends">
                <span v-for="t in TRENDS" :key="t.trend" :class="`text-${trendColor[t.trend]}`">
                  <q-icon :name="trendIcon[t.trend]" size="16px" />{{
                    data.progression.counts[t.trend] ?? 0
                  }}
                </span>
              </div>
              <div class="tile-label">{{ data.progression.weeks }} semanas</div>
            </q-card>
          </div>
        </div>

        <!-- Exercícios por tendência -->
        <q-card v-if="hasTrends" flat bordered>
          <q-tabs
            v-model="trendTab"
            dense
            no-caps
            align="justify"
            active-color="primary"
            indicator-color="primary"
            class="text-muted"
          >
            <q-tab
              v-for="t in TRENDS"
              :key="t.key"
              :name="t.key"
              :label="`${t.title} (${data.progression.counts[t.trend] ?? 0})`"
            />
          </q-tabs>
          <q-separator />
          <q-list v-if="trendItems.length" dense separator>
            <q-item
              v-for="item in trendItems"
              :key="item.exerciseId"
              clickable
              :to="{ name: 'exercise', params: { id: item.exerciseId }, query: { from: 'home' } }"
            >
              <q-item-section>
                <q-item-label>{{ item.name }}</q-item-label>
                <q-item-label caption>{{ item.latestSummary }}</q-item-label>
              </q-item-section>
              <q-item-section side><q-icon name="chevron_right" /></q-item-section>
            </q-item>
          </q-list>
          <div v-else class="text-caption text-muted text-center q-pa-md">Nenhum exercício.</div>
        </q-card>

        <LoadChartCard :exercises="data.progression.mostFrequent" />

        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Frequência semanal</div>
            <ChartCanvas v-if="anyFrequency" :config="frequencyChart" :height="150" />
            <div v-else class="text-caption text-muted text-center q-pa-md">
              Nenhum treino nas últimas {{ data.frequency.weeks.length }} semanas.
            </div>
          </q-card-section>
        </q-card>

        <BodyChartCard v-if="data.body" :trend="data.body.trend" />

        <q-card v-if="data.muscles.length" flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium">Séries por grupo muscular</div>
            <div class="text-caption text-muted q-mb-sm">
              Últimas {{ data.frequency.weeks.length }} semanas, séries válidas
            </div>
            <ChartCanvas :config="muscleChart" :height="muscleChartHeight" />
          </q-card-section>
        </q-card>

        <q-card v-if="data.recentSessions.length" flat bordered>
          <q-card-section class="q-pb-none">
            <div class="row items-center">
              <div class="text-subtitle1 text-weight-medium col">Últimos treinos</div>
              <q-btn
                flat
                dense
                no-caps
                color="primary"
                label="Histórico"
                :to="{ name: 'history' }"
              />
            </div>
          </q-card-section>
          <q-list separator>
            <q-item
              v-for="s in data.recentSessions"
              :key="s.id"
              clickable
              :to="{ name: 'session', params: { id: s.id } }"
            >
              <q-item-section>
                <q-item-label>{{ s.dayName ?? 'Treino avulso' }}</q-item-label>
                <q-item-label caption>
                  {{ formatDateTime(s.startedAt) }} ·
                  {{ formatDuration(s.startedAt, s.finishedAt) }} · {{ s.completedSets }}
                  {{ s.completedSets === 1 ? 'série' : 'séries' }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge v-if="s.status === 'IN_PROGRESS'" color="primary" label="Em andamento" />
                <q-icon v-else name="chevron_right" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>

        <q-card v-if="data.recentObservations.length" flat bordered>
          <q-card-section class="q-pb-xs">
            <div class="text-subtitle1 text-weight-medium">Observações recentes</div>
          </q-card-section>
          <q-list dense>
            <q-item v-for="o in data.recentObservations" :key="o.id">
              <q-item-section avatar>
                <q-icon
                  :name="categoryIcon[o.category]"
                  :color="
                    o.category === 'PAIN' || o.category === 'DISCOMFORT' ? 'warning' : 'grey-6'
                  "
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ categoryLabel[o.category] }}</q-item-label>
                <q-item-label caption>
                  {{ formatShortDate(o.observedAt) }}
                  <template v-if="observationText(o)"> · {{ observationText(o) }}</template>
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </template>
    </div>
  </q-page>
</template>

<style scoped>
.tile {
  height: 100%;
  padding: 10px 6px;
  text-align: center;
}
.tile-label {
  font-size: 12px;
  color: var(--app-muted);
  line-height: 1.3;
}
.tile-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
}
.tile-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-muted);
}
.tile-trends {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.6;
}
</style>
