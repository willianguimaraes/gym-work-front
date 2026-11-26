<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import type { Plan, PlanRequest } from '@/types/training'
import { goalLabel, options } from '@/utils/labels'
import { rules } from '@/utils/validation'

const props = defineProps<{
  plan?: Plan | null
  save: (payload: PlanRequest) => Promise<unknown>
}>()

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const form = reactive<PlanRequest>({
  name: props.plan?.name ?? '',
  goal: props.plan?.goal ?? 'HYPERTROPHY',
  startDate: props.plan?.startDate ?? null,
  expectedEndDate: props.plan?.expectedEndDate ?? null,
  notes: props.plan?.notes ?? null,
})
const errors = ref<Record<string, string>>({})
const generalError = ref('')
const saving = ref(false)
const goals = options(goalLabel)

async function onSubmit() {
  saving.value = true
  errors.value = {}
  generalError.value = ''
  try {
    const result = await props.save({
      ...form,
      startDate: form.startDate || null,
      expectedEndDate: form.expectedEndDate || null,
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
        <q-card-section class="text-h6">
          {{ plan ? 'Editar planejamento' : 'Novo planejamento' }}
        </q-card-section>

        <q-card-section class="q-gutter-y-md q-pt-none">
          <q-input
            v-model="form.name"
            label="Nome"
            placeholder="Ex.: Hipertrofia 2026"
            outlined
            autofocus
            :rules="[rules.required, rules.maxLength(120)]"
            :error="!!errors.name"
            :error-message="errors.name"
          />
          <q-select
            v-model="form.goal"
            :options="goals"
            label="Objetivo"
            outlined
            emit-value
            map-options
          />
          <div class="row q-col-gutter-sm">
            <q-input
              v-model="form.startDate"
              type="date"
              label="Início"
              stack-label
              outlined
              class="col-6"
              :error="!!errors.startDate"
              :error-message="errors.startDate"
            />
            <q-input
              v-model="form.expectedEndDate"
              type="date"
              label="Término previsto"
              stack-label
              outlined
              class="col-6"
              :error="!!errors.expectedEndDate"
              :error-message="errors.expectedEndDate"
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
