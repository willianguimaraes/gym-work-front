<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import type { Phase, PhaseRequest } from '@/types/training'
import { rules } from '@/utils/validation'

const props = defineProps<{
  phase?: Phase | null
  /** Data sugerida para uma nova fase (ex.: dia seguinte ao fim da anterior). */
  suggestedStart?: string | null
  save: (payload: PhaseRequest) => Promise<unknown>
}>()

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const form = reactive({
  name: props.phase?.name ?? '',
  startDate: props.phase?.startDate ?? props.suggestedStart ?? '',
  weeksCount: props.phase?.weeksCount ?? 8,
  notes: props.phase?.notes ?? '',
})
const errors = ref<Record<string, string>>({})
const generalError = ref('')
const saving = ref(false)

const weeksRule = (v: number | string) =>
  (Number(v) >= 1 && Number(v) <= 52 && Number.isInteger(Number(v))) || 'Entre 1 e 52 semanas'

async function onSubmit() {
  saving.value = true
  errors.value = {}
  generalError.value = ''
  try {
    const result = await props.save({
      name: form.name,
      startDate: form.startDate || null,
      weeksCount: Number(form.weeksCount),
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
        <q-card-section class="text-h6">{{ phase ? 'Editar fase' : 'Nova fase' }}</q-card-section>

        <q-card-section class="q-gutter-y-md q-pt-none">
          <q-input
            v-model="form.name"
            label="Nome"
            placeholder="Ex.: Fase 4 — Ombros e Peito Superior"
            outlined
            autofocus
            :rules="[rules.required, rules.maxLength(120)]"
            :error="!!errors.name"
            :error-message="errors.name"
          />
          <div class="row q-col-gutter-sm">
            <q-input
              v-model="form.startDate"
              type="date"
              label="Início"
              stack-label
              outlined
              class="col-7"
            />
            <q-input
              v-model.number="form.weeksCount"
              type="number"
              inputmode="numeric"
              label="Semanas"
              outlined
              class="col-5"
              :rules="[weeksRule]"
              :error="!!errors.weeksCount"
              :error-message="errors.weeksCount"
            />
          </div>
          <div
            v-if="phase && Number(form.weeksCount) < phase.weeksCount"
            class="text-warning text-caption"
          >
            As semanas acima de {{ form.weeksCount }} serão removidas, com o deload e as
            observações.
          </div>
          <q-input
            v-model="form.notes"
            type="textarea"
            label="Observações"
            outlined
            autogrow
            :rules="[rules.maxLength(2000)]"
          />
          <div v-if="generalError && !Object.keys(errors).length" class="text-negative">
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
