<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import { useSettingsStore } from '@/stores/settings'
import type { SetRequest, SetStatus, SetType, WorkoutSet } from '@/types/workout'
import { options, setStatusLabel, setTypeLabel } from '@/utils/labels'
import { displayToKg, kgToDisplay, weightLabel } from '@/utils/units'

/** Registro detalhado ou correção de uma série (tipo, status, RIR, descanso, observação). */
const props = defineProps<{
  title: string
  set?: WorkoutSet | null
  initial?: Partial<SetRequest>
  save: (payload: SetRequest) => Promise<unknown>
  remove?: () => Promise<unknown>
}>()

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const $q = useQuasar()
const settings = useSettingsStore()
const unit = computed(() => settings.settings?.weightUnit ?? 'KG')

const source = props.set ?? props.initial ?? {}
const form = reactive({
  setType: (source.setType ?? 'WORKING') as SetType,
  status: (source.status ?? 'COMPLETED') as SetStatus,
  load: (source.loadKg == null ? '' : kgToDisplay(source.loadKg, unit.value)) as number | string,
  reps: (source.reps ?? '') as number | string,
  rir: (source.rir ?? '') as number | string,
  restSeconds: (source.restSeconds ?? '') as number | string,
  notes: source.notes ?? '',
})
const errors = ref<Record<string, string>>({})
const generalError = ref('')
const saving = ref(false)

const types = options(setTypeLabel)
const statuses = options(setStatusLabel)

function optional(value: number | string): number | null {
  return value === '' || value == null ? null : Number(value)
}

async function onSubmit() {
  saving.value = true
  errors.value = {}
  generalError.value = ''
  try {
    const load = optional(form.load)
    const result = await props.save({
      clientId: null,
      setType: form.setType,
      status: form.status,
      loadKg: load == null ? null : displayToKg(load, unit.value),
      reps: optional(form.reps),
      rir: optional(form.rir),
      restSeconds: optional(form.restSeconds),
      notes: form.notes || null,
      parentSetId: props.set?.parentSetId ?? props.initial?.parentSetId ?? null,
    })
    onDialogOK(result)
  } catch (error) {
    errors.value = getFieldErrors(error)
    generalError.value = getErrorMessage(error)
  } finally {
    saving.value = false
  }
}

function onRemove() {
  if (!props.remove) return
  $q.dialog({
    title: 'Remover série',
    message: 'Remover esta série do treino?',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Remover', color: 'negative', unelevated: true },
  }).onOk(async () => {
    saving.value = true
    try {
      onDialogOK(await props.remove!())
    } catch (error) {
      generalError.value = getErrorMessage(error)
    } finally {
      saving.value = false
    }
  })
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <q-card class="dialog-card">
      <q-form @submit="onSubmit">
        <q-card-section class="text-h6">{{ title }}</q-card-section>
        <q-card-section class="q-pt-none">
          <div class="row q-col-gutter-sm">
            <q-select
              v-model="form.setType"
              :options="types"
              label="Tipo"
              outlined
              emit-value
              map-options
              class="col-6"
            />
            <q-select
              v-model="form.status"
              :options="statuses"
              label="Status"
              outlined
              emit-value
              map-options
              class="col-6"
            />
            <q-input
              v-model="form.load"
              type="number"
              inputmode="decimal"
              step="0.5"
              min="0"
              :label="`Carga (${weightLabel[unit]})`"
              outlined
              class="col-6"
              :error="!!errors.loadKg"
              :error-message="errors.loadKg"
            />
            <q-input
              v-model.number="form.reps"
              type="number"
              inputmode="numeric"
              min="0"
              label="Repetições"
              outlined
              class="col-6"
              :error="!!errors.reps"
              :error-message="errors.reps"
            />
            <q-input
              v-model.number="form.rir"
              type="number"
              inputmode="numeric"
              min="0"
              max="10"
              label="RIR"
              outlined
              class="col-6"
              :error="!!errors.rir"
              :error-message="errors.rir"
            />
            <q-input
              v-model.number="form.restSeconds"
              type="number"
              inputmode="numeric"
              min="0"
              label="Descanso feito (s)"
              outlined
              class="col-6"
              :error="!!errors.restSeconds"
              :error-message="errors.restSeconds"
            />
          </div>
          <q-input
            v-model="form.notes"
            type="textarea"
            label="Observação da série"
            outlined
            autogrow
            class="q-mt-sm"
            :error="!!errors.notes"
            :error-message="errors.notes"
          />
          <div v-if="generalError && !Object.keys(errors).length" class="text-negative">
            {{ generalError }}
          </div>
        </q-card-section>
        <q-card-actions class="q-px-md q-pb-md">
          <q-btn
            v-if="remove"
            flat
            color="negative"
            icon="delete"
            label="Remover"
            @click="onRemove"
          />
          <q-space />
          <q-btn flat label="Cancelar" @click="onDialogCancel" />
          <q-btn type="submit" color="primary" unelevated label="Salvar" :loading="saving" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>
