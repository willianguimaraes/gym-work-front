<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import { useSettingsStore } from '@/stores/settings'
import type { PlannedExercise, PlannedExerciseRequest } from '@/types/training'
import { displayToKg, kgToDisplay, weightLabel } from '@/utils/units'
import { rules } from '@/utils/validation'

const props = defineProps<{
  exerciseName: string
  planned?: PlannedExercise | null
  save: (payload: PlannedExerciseRequest) => Promise<unknown>
}>()

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const settings = useSettingsStore()
const unit = computed(() => settings.settings?.weightUnit ?? 'KG')

const p = props.planned
const form = reactive({
  sets: p?.sets ?? 3,
  repsMin: p?.repsMin ?? 8,
  repsMax: p?.repsMax ?? 12,
  restSeconds: (p ? p.restSeconds : (settings.settings?.defaultRestSeconds ?? 90)) as
    number | string | null,
  load: (p?.suggestedLoadKg == null ? '' : kgToDisplay(p.suggestedLoadKg, unit.value)) as
    number | string,
  targetRir: (p?.targetRir ?? '') as number | string,
  notes: p?.notes ?? '',
})
const errors = ref<Record<string, string>>({})
const generalError = ref('')
const saving = ref(false)

const between = (min: number, max: number, message: string) => (v: number | string) =>
  (Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max) || message
const optionalBetween =
  (min: number, max: number, message: string) => (v: number | string | null) =>
    v === '' || v == null || between(min, max, message)(v)
const repsOrder = () =>
  Number(form.repsMin) <= Number(form.repsMax) || 'Deve ser maior ou igual ao mínimo'
const loadRule = (v: number | string) => v === '' || Number(v) >= 0 || 'Carga inválida'

function optionalNumber(value: number | string | null): number | null {
  return value === '' || value == null ? null : Number(value)
}

async function onSubmit() {
  saving.value = true
  errors.value = {}
  generalError.value = ''
  try {
    const load = optionalNumber(form.load)
    const result = await props.save({
      sets: Number(form.sets),
      repsMin: Number(form.repsMin),
      repsMax: Number(form.repsMax),
      restSeconds: optionalNumber(form.restSeconds),
      suggestedLoadKg: load == null ? null : displayToKg(load, unit.value),
      targetRir: optionalNumber(form.targetRir),
      notes: form.notes || null,
    })
    onDialogOK(result)
  } catch (error) {
    errors.value = getFieldErrors(error)
    generalError.value = getErrorMessage(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <q-card class="dialog-card">
      <q-form @submit="onSubmit">
        <q-card-section>
          <div class="text-overline text-muted">
            {{ planned ? 'Editar exercício' : 'Adicionar exercício' }}
          </div>
          <div class="text-h6">{{ exerciseName }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="row q-col-gutter-sm">
            <q-input
              v-model.number="form.sets"
              type="number"
              inputmode="numeric"
              label="Séries"
              outlined
              class="col-4"
              :rules="[between(1, 20, '1 a 20')]"
              :error="!!errors.sets"
              :error-message="errors.sets"
            />
            <q-input
              v-model.number="form.repsMin"
              type="number"
              inputmode="numeric"
              label="Reps mín."
              outlined
              class="col-4"
              :rules="[between(1, 100, '1 a 100')]"
              :error="!!errors.repsMin"
              :error-message="errors.repsMin"
            />
            <q-input
              v-model.number="form.repsMax"
              type="number"
              inputmode="numeric"
              label="Reps máx."
              outlined
              class="col-4"
              :rules="[between(1, 100, '1 a 100'), repsOrder]"
              :error="!!errors.repsMax"
              :error-message="errors.repsMax"
            />
            <q-input
              v-model.number="form.restSeconds"
              type="number"
              inputmode="numeric"
              label="Descanso (s)"
              outlined
              class="col-4"
              :rules="[optionalBetween(0, 900, '0 a 900 s')]"
              :error="!!errors.restSeconds"
              :error-message="errors.restSeconds"
            />
            <q-input
              v-model="form.load"
              type="number"
              inputmode="decimal"
              step="0.5"
              :label="`Carga (${weightLabel[unit]})`"
              outlined
              class="col-4"
              :rules="[loadRule]"
              :error="!!errors.suggestedLoadKg"
              :error-message="errors.suggestedLoadKg"
            />
            <q-input
              v-model.number="form.targetRir"
              type="number"
              inputmode="numeric"
              label="RIR alvo"
              outlined
              class="col-4"
              :rules="[optionalBetween(0, 10, '0 a 10')]"
              :error="!!errors.targetRir"
              :error-message="errors.targetRir"
            />
          </div>
          <q-input
            v-model="form.notes"
            type="textarea"
            label="Observações"
            outlined
            autogrow
            :rules="[rules.maxLength(2000)]"
          />
          <div v-if="errors.exerciseId" class="text-negative">{{ errors.exerciseId }}</div>
          <div v-else-if="generalError && !Object.keys(errors).length" class="text-negative">
            {{ generalError }}
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Cancelar" @click="onDialogCancel" />
          <q-btn type="submit" color="primary" unelevated label="Salvar" :loading="saving" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>
