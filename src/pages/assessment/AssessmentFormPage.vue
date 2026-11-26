<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { usePageHeader } from '@/composables/usePageHeader'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import { assessmentService } from '@/services/assessment.service'
import { useSettingsStore } from '@/stores/settings'
import type { MeasurementType } from '@/types/assessment'
import { MEASUREMENT_TYPES, measurementLabel } from '@/utils/labels'
import {
  cmToDisplay,
  displayToCm,
  displayToKg,
  kgToDisplay,
  lengthLabel,
  weightLabel,
} from '@/utils/units'
import { rules } from '@/utils/validation'

/** Criação/edição de avaliação física. Todos os campos são opcionais, menos a data. */
const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()

const weightUnit = computed(() => settings.settings?.weightUnit ?? 'KG')
const lengthUnit = computed(() => settings.settings?.lengthUnit ?? 'CM')
const editingId = computed(() => (route.params.id ? String(route.params.id) : null))

function todayIso() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

const form = reactive({
  assessedOn: todayIso(),
  weight: '' as number | string,
  height: '' as number | string,
  bodyFat: '' as number | string,
  notes: '',
  measurements: Object.fromEntries(MEASUREMENT_TYPES.map((t) => [t, ''])) as Record<
    MeasurementType,
    number | string
  >,
})
const errors = ref<Record<string, string>>({})
const loading = ref(!!editingId.value)
const loadError = ref('')
const saving = ref(false)
const showMeasurements = ref(false)

usePageHeader({
  back: computed(() =>
    editingId.value
      ? { name: 'assessment', params: { id: editingId.value } }
      : { name: 'assessments' },
  ),
})

const groups: { title: string; types: MeasurementType[] }[] = [
  { title: 'Tronco', types: ['SHOULDERS', 'CHEST', 'WAIST', 'ABDOMEN'] },
  { title: 'Braços', types: ['ARM_RIGHT', 'ARM_LEFT', 'FOREARM_RIGHT', 'FOREARM_LEFT'] },
  { title: 'Pernas', types: ['THIGH_RIGHT', 'THIGH_LEFT', 'CALF_RIGHT', 'CALF_LEFT'] },
]

onMounted(async () => {
  if (!editingId.value) return
  try {
    const a = await assessmentService.get(editingId.value)
    form.assessedOn = a.assessedOn
    form.weight = a.weightKg == null ? '' : kgToDisplay(a.weightKg, weightUnit.value)
    form.height = a.heightCm == null ? '' : cmToDisplay(a.heightCm, lengthUnit.value)
    form.bodyFat = a.bodyFatPct ?? ''
    form.notes = a.notes ?? ''
    for (const m of a.measurements)
      form.measurements[m.type] = cmToDisplay(m.valueCm, lengthUnit.value)
    showMeasurements.value = a.measurements.length > 0
  } catch (e) {
    loadError.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
})

function num(value: number | string): number | null {
  return value === '' || value == null ? null : Number(value)
}

async function onSubmit() {
  saving.value = true
  errors.value = {}
  try {
    const weight = num(form.weight)
    const height = num(form.height)
    const payload = {
      assessedOn: form.assessedOn,
      weightKg: weight == null ? null : displayToKg(weight, weightUnit.value),
      heightCm: height == null ? null : displayToCm(height, lengthUnit.value),
      bodyFatPct: num(form.bodyFat),
      notes: form.notes || null,
      measurements: MEASUREMENT_TYPES.filter((t) => num(form.measurements[t]) != null).map((t) => ({
        type: t,
        valueCm: displayToCm(Number(form.measurements[t]), lengthUnit.value),
      })),
    }
    const saved = editingId.value
      ? await assessmentService.update(editingId.value, payload)
      : await assessmentService.create(payload)
    $q.notify({ type: 'positive', message: 'Avaliação salva' })
    await router.replace({ name: 'assessment', params: { id: saved.id } })
  } catch (e) {
    errors.value = getFieldErrors(e)
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>
      <q-banner v-else-if="loadError" rounded class="bg-negative text-white">{{
        loadError
      }}</q-banner>

      <q-form v-else class="q-gutter-y-md" @submit="onSubmit">
        <q-input
          v-model="form.assessedOn"
          type="date"
          label="Data"
          stack-label
          outlined
          :rules="[rules.required]"
          :error="!!errors.assessedOn"
          :error-message="errors.assessedOn"
        />
        <div class="row q-col-gutter-sm">
          <q-input
            v-model="form.weight"
            type="number"
            inputmode="decimal"
            step="0.1"
            :label="`Peso (${weightLabel[weightUnit]})`"
            outlined
            class="col-4"
            :error="!!errors.weightKg"
            :error-message="errors.weightKg"
          />
          <q-input
            v-model="form.bodyFat"
            type="number"
            inputmode="decimal"
            step="0.1"
            label="Gordura (%)"
            outlined
            class="col-4"
            :error="!!errors.bodyFatPct"
            :error-message="errors.bodyFatPct"
          />
          <q-input
            v-model="form.height"
            type="number"
            inputmode="decimal"
            step="0.1"
            :label="`Altura (${lengthLabel[lengthUnit]})`"
            outlined
            class="col-4"
            :error="!!errors.heightCm"
            :error-message="errors.heightCm"
          />
        </div>
        <div class="text-caption text-muted">
          Preencha só o que mediu. Campos vazios ficam sem valor; nada é estimado.
        </div>

        <q-expansion-item
          v-model="showMeasurements"
          icon="straighten"
          :label="`Medidas (${lengthLabel[lengthUnit]})`"
          header-class="rounded-borders"
          class="measure-box rounded-borders"
        >
          <div class="q-pa-sm">
            <div v-for="group in groups" :key="group.title" class="q-mb-sm">
              <div class="text-caption text-muted q-mb-xs">{{ group.title }}</div>
              <div class="row q-col-gutter-sm">
                <q-input
                  v-for="type in group.types"
                  :key="type"
                  v-model="form.measurements[type]"
                  type="number"
                  inputmode="decimal"
                  step="0.1"
                  :label="measurementLabel[type]"
                  outlined
                  dense
                  class="col-6"
                />
              </div>
            </div>
            <div v-if="errors.measurements" class="text-negative text-caption">
              {{ errors.measurements }}
            </div>
          </div>
        </q-expansion-item>

        <q-input
          v-model="form.notes"
          type="textarea"
          label="Observações"
          outlined
          autogrow
          :rules="[rules.maxLength(2000)]"
        />
        <div v-if="!editingId" class="text-caption text-muted">
          As fotos são adicionadas depois de salvar.
        </div>
        <q-btn
          type="submit"
          color="primary"
          unelevated
          size="lg"
          label="Salvar"
          class="full-width"
          :loading="saving"
        />
      </q-form>
    </div>
  </q-page>
</template>

<style scoped>
.measure-box {
  border: 1px solid var(--app-border);
}
</style>
