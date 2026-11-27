<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChartConfiguration } from 'chart.js'
import ChartCanvas from '@/components/charts/ChartCanvas.vue'
import { useSettingsStore } from '@/stores/settings'
import type { MeasurementType, TrendPoint } from '@/types/assessment'
import { formatDate, MEASUREMENT_TYPES, measurementLabel } from '@/utils/labels'
import { cmToDisplay, kgToDisplay, lengthLabel, weightLabel } from '@/utils/units'

/** Peso corporal e medidas das avaliações mais recentes, num gráfico só (escolha da série). */
const props = defineProps<{ trend: TrendPoint[] }>()

const settings = useSettingsStore()
const weightUnit = computed(() => settings.settings?.weightUnit ?? 'KG')
const lengthUnit = computed(() => settings.settings?.lengthUnit ?? 'CM')

type Series = 'WEIGHT' | MeasurementType
const measured = computed(() =>
  MEASUREMENT_TYPES.filter((t) => props.trend.filter((p) => p.measurements[t] != null).length > 1),
)
const options = computed(() => [
  { value: 'WEIGHT' as Series, label: 'Peso' },
  ...measured.value.map((t) => ({ value: t as Series, label: measurementLabel[t] })),
])
const series = ref<Series>('WEIGHT')

const points = computed(() =>
  props.trend
    .map((p) => ({
      date: p.assessedOn,
      value: series.value === 'WEIGHT' ? p.weightKg : (p.measurements[series.value] ?? null),
    }))
    .filter((p): p is { date: string; value: number } => p.value != null),
)

const chart = computed<ChartConfiguration>(() => {
  const isWeight = series.value === 'WEIGHT'
  const unit = isWeight ? weightLabel[weightUnit.value] : lengthLabel[lengthUnit.value]
  return {
    type: 'line',
    data: {
      labels: points.value.map((p) => formatDate(p.date).slice(0, 5)),
      datasets: [
        {
          label: `${options.value.find((o) => o.value === series.value)?.label} (${unit})`,
          data: points.value.map((p) =>
            isWeight
              ? kgToDisplay(p.value, weightUnit.value)
              : cmToDisplay(p.value, lengthUnit.value),
          ),
          borderColor: isWeight ? '#3b82f6' : '#22c55e',
          backgroundColor: isWeight ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
          fill: true,
          tension: 0.25,
          pointRadius: 4,
        },
      ],
    },
    options: { plugins: { legend: { display: false } } },
  }
})
</script>

<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="row items-center no-wrap q-mb-sm">
        <div class="text-subtitle1 text-weight-medium col">Corpo</div>
        <q-select
          v-if="options.length > 1"
          v-model="series"
          :options="options"
          emit-value
          map-options
          dense
          outlined
          options-dense
          style="min-width: 140px"
        />
      </div>
      <ChartCanvas v-if="points.length > 1" :config="chart" :height="170" />
      <div v-else class="text-caption text-muted text-center q-pa-md">
        O gráfico aparece com duas avaliações com este valor.
      </div>
    </q-card-section>
  </q-card>
</template>
