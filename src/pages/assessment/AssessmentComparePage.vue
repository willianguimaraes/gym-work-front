<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PhotoImage from '@/components/assessment/PhotoImage.vue'
import { getErrorMessage } from '@/services/api'
import { assessmentService } from '@/services/assessment.service'
import { useSettingsStore } from '@/stores/settings'
import type { AssessmentSummary, Comparison, ComparisonItem } from '@/types/assessment'
import { formatDate, measurementLabel, photoPositionLabel } from '@/utils/labels'
import { cmToDisplay, kgToDisplay, lengthLabel, weightLabel } from '@/utils/units'

/** Comparativo entre duas avaliações: valores, diferenças e fotos lado a lado. */
const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const weightUnit = computed(() => settings.settings?.weightUnit ?? 'KG')
const lengthUnit = computed(() => settings.settings?.lengthUnit ?? 'CM')

const options = ref<AssessmentSummary[]>([])
const a = ref<string | null>(null)
const b = ref<string | null>(null)
const comparison = ref<Comparison | null>(null)
const loading = ref(true)
const error = ref('')

const selectOptions = computed(() =>
  options.value.map((o) => ({
    value: o.id,
    label:
      formatDate(o.assessedOn) +
      (o.weightKg != null
        ? ` · ${kgToDisplay(o.weightKg, weightUnit.value)} ${weightLabel[weightUnit.value]}`
        : ''),
  })),
)

onMounted(async () => {
  try {
    options.value = (await assessmentService.list(0, 100)).content
    const fromQueryB = typeof route.query.b === 'string' ? route.query.b : null
    const fromQueryA = typeof route.query.a === 'string' ? route.query.a : null
    b.value = fromQueryB ?? options.value[0]?.id ?? null
    a.value = fromQueryA ?? options.value.find((o) => o.id !== b.value)?.id ?? null
    // a mais antiga da lista como padrão para "antes"
    if (!fromQueryA && options.value.length > 1)
      a.value = options.value[options.value.length - 1]!.id
    if (a.value === b.value) a.value = options.value.find((o) => o.id !== b.value)?.id ?? null
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
})

watch([a, b], async ([first, second]) => {
  comparison.value = null
  if (!first || !second || first === second) return
  void router.replace({ query: { a: first, b: second } })
  try {
    comparison.value = await assessmentService.compare(first, second)
  } catch (e) {
    error.value = getErrorMessage(e)
  }
})

function label(item: ComparisonItem): string {
  if (item.metric === 'WEIGHT') return 'Peso'
  if (item.metric === 'BODY_FAT') return 'Gordura corporal'
  if (item.metric === 'HEIGHT') return 'Altura'
  return measurementLabel[item.metric]
}

function value(item: ComparisonItem, raw: number | null): string {
  if (raw == null) return '—'
  if (item.unit === 'kg')
    return `${kgToDisplay(raw, weightUnit.value)} ${weightLabel[weightUnit.value]}`
  if (item.unit === 'cm')
    return `${cmToDisplay(raw, lengthUnit.value)} ${lengthLabel[lengthUnit.value]}`
  return `${raw}%`
}

function difference(item: ComparisonItem): string {
  if (item.difference == null) return 'sem dado'
  const sign = item.difference > 0 ? '+' : ''
  if (item.unit === 'kg')
    return `${sign}${kgToDisplay(item.difference, weightUnit.value)} ${weightLabel[weightUnit.value]}`
  if (item.unit === 'cm')
    return `${sign}${cmToDisplay(item.difference, lengthUnit.value)} ${lengthLabel[lengthUnit.value]}`
  return `${sign}${item.difference} p.p.`
}
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>
      <q-banner v-else-if="error" rounded class="bg-negative text-white">{{ error }}</q-banner>

      <template v-else>
        <div v-if="options.length < 2" class="text-center text-muted q-pa-lg">
          É preciso ter ao menos duas avaliações para comparar.
        </div>
        <template v-else>
          <div class="row q-col-gutter-sm">
            <q-select
              v-model="a"
              :options="selectOptions"
              emit-value
              map-options
              outlined
              dense
              label="Antes"
              class="col-6"
            />
            <q-select
              v-model="b"
              :options="selectOptions"
              emit-value
              map-options
              outlined
              dense
              label="Depois"
              class="col-6"
            />
          </div>

          <div v-if="a === b" class="text-caption text-warning">
            Escolha duas avaliações diferentes.
          </div>

          <template v-if="comparison">
            <div class="text-caption text-muted">
              {{ formatDate(comparison.from.assessedOn) }} →
              {{ formatDate(comparison.to.assessedOn) }} ({{ comparison.daysBetween }} dias).
              Diferença só quando o valor existe nas duas.
            </div>

            <q-markup-table
              v-if="comparison.items.length"
              flat
              bordered
              dense
              separator="horizontal"
            >
              <thead>
                <tr>
                  <th class="text-left">Medida</th>
                  <th class="text-right">Antes</th>
                  <th class="text-right">Depois</th>
                  <th class="text-right">Dif.</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in comparison.items" :key="item.metric">
                  <td class="text-left">{{ label(item) }}</td>
                  <td class="text-right">{{ value(item, item.fromValue) }}</td>
                  <td class="text-right">{{ value(item, item.toValue) }}</td>
                  <td
                    class="text-right text-weight-medium"
                    :class="item.difference == null ? 'text-muted' : ''"
                  >
                    {{ difference(item) }}
                  </td>
                </tr>
              </tbody>
            </q-markup-table>
            <div v-else class="text-center text-muted">
              Nenhum valor registrado nessas avaliações.
            </div>

            <div v-for="pair in comparison.photos" :key="pair.position">
              <div class="text-subtitle2 q-mb-xs">{{ photoPositionLabel[pair.position] }}</div>
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <PhotoImage v-if="pair.from" :photo="pair.from" />
                  <div
                    v-else
                    class="no-photo flex flex-center rounded-borders text-muted text-caption"
                  >
                    Sem foto
                  </div>
                  <div class="text-caption text-center text-muted">
                    {{ formatDate(comparison.from.assessedOn) }}
                  </div>
                </div>
                <div class="col-6">
                  <PhotoImage v-if="pair.to" :photo="pair.to" />
                  <div
                    v-else
                    class="no-photo flex flex-center rounded-borders text-muted text-caption"
                  >
                    Sem foto
                  </div>
                  <div class="text-caption text-center text-muted">
                    {{ formatDate(comparison.to.assessedOn) }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>
      </template>
    </div>
  </q-page>
</template>

<style scoped>
.no-photo {
  aspect-ratio: 3 / 4;
  border: 1px dashed var(--app-border);
}
</style>
