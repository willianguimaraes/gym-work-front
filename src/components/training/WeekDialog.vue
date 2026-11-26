<script setup lang="ts">
import { ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getErrorMessage } from '@/services/api'
import type { Week } from '@/types/training'
import { formatDate } from '@/utils/labels'
import { rules } from '@/utils/validation'

const props = defineProps<{
  week: Week
  save: (payload: { deload: boolean; notes: string | null }) => Promise<unknown>
}>()

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const deload = ref(props.week.deload)
const notes = ref(props.week.notes ?? '')
const error = ref('')
const saving = ref(false)

async function onSubmit() {
  saving.value = true
  error.value = ''
  try {
    onDialogOK(await props.save({ deload: deload.value, notes: notes.value || null }))
  } catch (e) {
    error.value = getErrorMessage(e)
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
          <div class="text-h6">Semana {{ week.weekNumber }}</div>
          <div v-if="week.startDate" class="text-caption text-muted">
            A partir de {{ formatDate(week.startDate) }}
          </div>
        </q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-none">
          <q-toggle v-model="deload" label="Semana de deload (carga ou volume reduzidos)" />
          <q-input
            v-model="notes"
            type="textarea"
            label="Observações da semana"
            outlined
            autogrow
            :rules="[rules.maxLength(2000)]"
          />
          <div v-if="error" class="text-negative">{{ error }}</div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Cancelar" @click="onDialogCancel" />
          <q-btn type="submit" color="primary" unelevated label="Salvar" :loading="saving" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>
