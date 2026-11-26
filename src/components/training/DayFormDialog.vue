<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import type { DayOfWeek, DayRequest, WorkoutDay } from '@/types/training'
import { dayOfWeekLabel, options } from '@/utils/labels'
import { rules } from '@/utils/validation'

const props = defineProps<{
  day?: WorkoutDay | null
  save: (payload: DayRequest) => Promise<unknown>
}>()

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const form = reactive({
  name: props.day?.name ?? '',
  dayOfWeek: (props.day?.dayOfWeek ?? null) as DayOfWeek | null,
  notes: props.day?.notes ?? '',
})
const errors = ref<Record<string, string>>({})
const generalError = ref('')
const saving = ref(false)
const weekdays = options(dayOfWeekLabel)

async function onSubmit() {
  saving.value = true
  errors.value = {}
  generalError.value = ''
  try {
    const result = await props.save({
      name: form.name,
      dayOfWeek: form.dayOfWeek,
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
        <q-card-section class="text-h6">
          {{ day ? 'Editar dia de treino' : 'Novo dia de treino' }}
        </q-card-section>

        <q-card-section class="q-gutter-y-md q-pt-none">
          <q-input
            v-model="form.name"
            label="Nome"
            placeholder="Ex.: UPPER, LOWER A, PUSH"
            outlined
            autofocus
            :rules="[rules.required, rules.maxLength(60)]"
            :error="!!errors.name"
            :error-message="errors.name"
          />
          <div>
            <div class="text-caption text-muted q-mb-xs">Dia da semana (opcional)</div>
            <div class="row q-gutter-xs">
              <q-chip
                v-for="weekday in weekdays"
                :key="weekday.value"
                clickable
                :outline="form.dayOfWeek !== weekday.value"
                :color="form.dayOfWeek === weekday.value ? 'primary' : undefined"
                :text-color="form.dayOfWeek === weekday.value ? 'white' : undefined"
                @click="form.dayOfWeek = form.dayOfWeek === weekday.value ? null : weekday.value"
              >
                {{ weekday.label.slice(0, 3) }}
              </q-chip>
            </div>
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
