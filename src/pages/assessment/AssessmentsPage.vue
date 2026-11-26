<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import type { ChartConfiguration } from 'chart.js'
import ChartCanvas from '@/components/charts/ChartCanvas.vue'
import { getErrorMessage } from '@/services/api'
import { assessmentService } from '@/services/assessment.service'
import { useSettingsStore } from '@/stores/settings'
import type { AssessmentSummary, MeasurementType, TrendPoint } from '@/types/assessment'
import { formatDate, MEASUREMENT_TYPES, measurementLabel } from '@/utils/labels'
import { cmToDisplay, displayToKg, kgToDisplay, lengthLabel, weightLabel } from '@/utils/units'

/** Avaliação física: registro rápido de peso, gráficos de evolução e lista de avaliações. */
const $q = useQuasar()
const router = useRouter()
const settings = useSettingsStore()
const weightUnit = computed(() => settings.settings?.weightUnit ?? 'KG')
const lengthUnit = computed(() => settings.settings?.lengthUnit ?? 'CM')

const items = ref<AssessmentSummary[]>([])
const total = ref(0)
const page = ref(0)
const trend = ref<TrendPoint[]>([])
const loading = ref(true)
const error = ref('')
const measurement = ref<MeasurementType>('WAIST')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [list, points] = await Promise.all([assessmentService.list(0), assessmentService.trend()])
    items.value = list.content
    total.value = list.totalElements
    page.value = 0
    trend.value = points
    const firstMeasured = MEASUREMENT_TYPES.find((t) =>
      points.some((p) => p.measurements[t] != null),
    )
    if (firstMeasured && !points.some((p) => p.measurements[measurement.value] != null)) {
      measurement.value = firstMeasured
    }
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function more() {
  const next = await assessmentService.list(page.value + 1)
  items.value = [...items.value, ...next.content]
  page.value = next.page
}

function todayIso() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Registro rápido de peso (A6): cria uma avaliação só com o peso, com a data de hoje. */
function quickWeight() {
  $q.dialog({
    title: 'Registrar peso',
    message: `Peso de hoje (${weightLabel[weightUnit.value]})`,
    prompt: {
      model: '',
      type: 'number',
      inputmode: 'decimal',
      step: '0.1',
      outlined: true,
      isValid: (v: string) => Number(v) > 0,
    },
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Salvar', color: 'primary', unelevated: true },
  }).onOk(async (value: string) => {
    try {
      await assessmentService.create({
        assessedOn: todayIso(),
        weightKg: displayToKg(Number(value), weightUnit.value),
        heightCm: null,
        bodyFatPct: null,
        notes: null,
        measurements: [],
      })
      $q.notify({ type: 'positive', message: 'Peso registrado' })
      await load()
    } catch (e) {
      $q.notify({ type: 'negative', message: getErrorMessage(e) })
    }
  })
}

const weightPoints = computed(() => trend.value.filter((p) => p.weightKg != null))
const measuredTypes = computed(() =>
  MEASUREMENT_TYPES.filter((t) => trend.value.some((p) => p.measurements[t] != null)),
)
const measurementPoints = computed(() =>
  trend.value.filter((p) => p.measurements[measurement.value] != null),
)

const weightChart = computed<ChartConfiguration>(() => ({
  type: 'line',
  data: {
    labels: weightPoints.value.map((p) => formatDate(p.assessedOn).slice(0, 5)),
    datasets: [
      {
        label: `Peso (${weightLabel[weightUnit.value]})`,
        data: weightPoints.value.map((p) => kgToDisplay(p.weightKg!, weightUnit.value)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.15)',
        fill: true,
        tension: 0.25,
        pointRadius: 4,
      },
    ],
  },
  options: { plugins: { legend: { display: false } } },
}))

const measurementChart = computed<ChartConfiguration>(() => ({
  type: 'line',
  data: {
    labels: measurementPoints.value.map((p) => formatDate(p.assessedOn).slice(0, 5)),
    datasets: [
      {
        label: `${measurementLabel[measurement.value]} (${lengthLabel[lengthUnit.value]})`,
        data: measurementPoints.value.map((p) =>
          cmToDisplay(p.measurements[measurement.value]!, lengthUnit.value),
        ),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.15)',
        fill: true,
        tension: 0.25,
        pointRadius: 4,
      },
    ],
  },
  options: { plugins: { legend: { display: false } } },
}))

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
        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <q-btn
              color="primary"
              unelevated
              icon="monitor_weight"
              label="Registrar peso"
              no-caps
              class="full-width"
              @click="quickWeight"
            />
          </div>
          <div class="col-6">
            <q-btn
              outline
              color="primary"
              icon="compare"
              label="Comparar"
              no-caps
              class="full-width"
              :disable="items.length < 2"
              :to="{ name: 'assessment-compare' }"
            />
          </div>
        </div>

        <q-card v-if="weightPoints.length > 1" flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Peso corporal</div>
            <ChartCanvas :config="weightChart" :height="200" />
          </q-card-section>
        </q-card>

        <q-card v-if="measuredTypes.length" flat bordered>
          <q-card-section>
            <div class="row items-center q-mb-sm no-wrap">
              <div class="text-subtitle1 text-weight-medium col">Medidas</div>
              <q-select
                v-model="measurement"
                :options="measuredTypes.map((t) => ({ value: t, label: measurementLabel[t] }))"
                emit-value
                map-options
                dense
                outlined
                style="min-width: 160px"
              />
            </div>
            <ChartCanvas
              v-if="measurementPoints.length > 1"
              :config="measurementChart"
              :height="200"
            />
            <div v-else class="text-caption text-muted text-center q-pa-md">
              O gráfico aparece com duas avaliações com esta medida.
            </div>
          </q-card-section>
        </q-card>

        <div v-if="!items.length" class="text-center q-pa-lg">
          <q-icon name="accessibility_new" size="48px" color="grey-6" />
          <div class="text-subtitle1 q-mt-sm">Nenhuma avaliação</div>
          <div class="text-muted">
            Registre o peso ou faça uma avaliação completa com medidas e fotos.
          </div>
        </div>

        <q-list v-else bordered separator class="rounded-borders">
          <q-item
            v-for="item in items"
            :key="item.id"
            clickable
            @click="router.push({ name: 'assessment', params: { id: item.id } })"
          >
            <q-item-section>
              <q-item-label class="text-weight-medium">{{
                formatDate(item.assessedOn)
              }}</q-item-label>
              <q-item-label caption>
                <template v-if="item.weightKg != null">
                  {{ kgToDisplay(item.weightKg, weightUnit) }} {{ weightLabel[weightUnit] }}
                </template>
                <template v-if="item.bodyFatPct != null">
                  · {{ item.bodyFatPct }}% gordura</template
                >
                <template v-if="item.measurementsCount">
                  · {{ item.measurementsCount }} medidas</template
                >
              </q-item-label>
            </q-item-section>
            <q-item-section v-if="item.photosCount" side>
              <div class="row items-center no-wrap text-muted">
                <q-icon name="photo_camera" size="18px" class="q-mr-xs" />{{ item.photosCount }}
              </div>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-if="items.length < total" class="flex flex-center">
          <q-btn
            flat
            no-caps
            color="primary"
            :label="`Carregar mais (${total - items.length})`"
            @click="more"
          />
        </div>
      </template>
    </div>

    <q-page-sticky position="bottom-right" :offset="[16, 16]">
      <q-btn
        fab
        color="primary"
        icon="add"
        aria-label="Nova avaliação"
        :to="{ name: 'assessment-new' }"
      />
    </q-page-sticky>
  </q-page>
</template>
