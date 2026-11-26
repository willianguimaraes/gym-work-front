<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useQuasar } from 'quasar'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

Chart.register(
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
)

/**
 * Canvas do Chart.js que acompanha o tema (texto e grade) e recria o gráfico quando a
 * configuração muda.
 */
const props = withDefaults(defineProps<{ config: ChartConfiguration; height?: number }>(), {
  height: 240,
})

const $q = useQuasar()
const canvas = ref<HTMLCanvasElement | null>(null)
const chart = shallowRef<Chart | null>(null)

function themed(config: ChartConfiguration): ChartConfiguration {
  const dark = $q.dark.isActive
  const text = dark ? '#9aa1ad' : '#5f6672'
  const grid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  Chart.defaults.color = text
  Chart.defaults.borderColor = grid
  Chart.defaults.font.family = 'Roboto, -apple-system, "Segoe UI", sans-serif'
  return {
    ...config,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      ...config.options,
    },
  } as ChartConfiguration
}

function render() {
  chart.value?.destroy()
  if (!canvas.value) return
  chart.value = new Chart(canvas.value, themed(props.config))
}

onMounted(render)
watch(() => [props.config, $q.dark.isActive], render)
onBeforeUnmount(() => chart.value?.destroy())
</script>

<template>
  <div class="chart-box" :style="{ height: `${height}px` }">
    <canvas ref="canvas" />
  </div>
</template>

<style scoped>
.chart-box {
  position: relative;
  width: 100%;
}
</style>
