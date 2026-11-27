<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ChartConfiguration } from 'chart.js'
import ChartCanvas from '@/components/charts/ChartCanvas.vue'
import { progressionService } from '@/services/progression.service'
import { useSettingsStore } from '@/stores/settings'
import type { DashboardExercise } from '@/types/dashboard'
import type { ProgressPoint } from '@/types/progression'
import { formatShortDate } from '@/utils/labels'
import { kgToDisplay, weightLabel } from '@/utils/units'

/** Evolução de carga dos exercícios mais feitos: maior carga por sessão e 1RM estimado. */
const props = defineProps<{ exercises: DashboardExercise[] }>()

const settings = useSettingsStore()
const unit = computed(() => settings.settings?.weightUnit ?? 'KG')
const exerciseId = ref<string | null>(props.exercises[0]?.exerciseId ?? null)
const points = ref<ProgressPoint[]>([])
const loading = ref(false)
const failed = ref(false)

watch(
  exerciseId,
  async (id) => {
    points.value = []
    failed.value = false
    if (!id) return
    loading.value = true
    try {
      points.value = await progressionService.progress(id, 'SESSION')
    } catch {
      failed.value = true
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const options = computed(() => props.exercises.map((e) => ({ value: e.exerciseId, label: e.name })))

const chart = computed<ChartConfiguration>(() => {
  const recent = points.value.slice(-12)
  return {
    type: 'line',
    data: {
      labels: recent.map((p) =>
        formatShortDate(p.date.length === 10 ? `${p.date}T12:00:00` : p.date),
      ),
      datasets: [
        {
          label: `Maior carga (${weightLabel[unit.value]})`,
          data: recent.map((p) => kgToDisplay(p.topLoadKg, unit.value)),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.15)',
          fill: true,
          tension: 0.25,
          pointRadius: 4,
        },
        {
          label: `1RM estimado (${weightLabel[unit.value]})`,
          data: recent.map((p) =>
            p.bestEstimatedOneRepMaxKg == null
              ? null
              : kgToDisplay(p.bestEstimatedOneRepMaxKg, unit.value),
          ),
          borderColor: '#a855f7',
          borderDash: [4, 4],
          tension: 0.25,
          pointRadius: 2,
        },
      ],
    },
    options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } },
  }
})
</script>

<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="row items-center no-wrap q-mb-sm">
        <div class="text-subtitle1 text-weight-medium col">Evolução de carga</div>
        <q-select
          v-if="options.length"
          v-model="exerciseId"
          :options="options"
          emit-value
          map-options
          dense
          outlined
          options-dense
          class="exercise-select"
        />
      </div>
      <div v-if="!options.length" class="text-caption text-muted text-center q-pa-md">
        O gráfico aparece depois dos primeiros treinos finalizados.
      </div>
      <div v-else-if="loading" class="flex flex-center" style="height: 180px">
        <q-spinner color="primary" size="28px" />
      </div>
      <div v-else-if="failed" class="text-caption text-muted text-center q-pa-md">
        Não foi possível carregar o gráfico.
      </div>
      <div v-else-if="points.length < 2" class="text-caption text-muted text-center q-pa-md">
        O gráfico aparece com duas sessões deste exercício.
      </div>
      <ChartCanvas v-else :config="chart" :height="180" />
    </q-card-section>
  </q-card>
</template>

<style scoped>
.exercise-select {
  max-width: 55%;
  min-width: 140px;
}
</style>
