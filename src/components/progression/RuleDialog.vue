<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import { progressionService } from '@/services/progression.service'
import { useSettingsStore } from '@/stores/settings'
import type { ProgressionRule } from '@/types/progression'
import { displayToKg, kgToDisplay, weightLabel } from '@/utils/units'

/** Ajuste da regra de progressão de um exercício (A12). */
const props = defineProps<{ exerciseName: string; rule: ProgressionRule }>()

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const settings = useSettingsStore()
const unit = computed(() => settings.settings?.weightUnit ?? 'KG')

const form = reactive({
  enabled: props.rule.enabled,
  sessionsAtTop: props.rule.sessionsAtTop,
  minRir: (props.rule.minRir ?? '') as number | string,
  increment: (props.rule.loadIncrementKg == null
    ? ''
    : kgToDisplay(props.rule.loadIncrementKg, unit.value)) as number | string,
})
const errors = ref<Record<string, string>>({})
const generalError = ref('')
const saving = ref(false)

async function onSubmit() {
  saving.value = true
  errors.value = {}
  generalError.value = ''
  try {
    const increment = form.increment === '' ? null : displayToKg(Number(form.increment), unit.value)
    onDialogOK(
      await progressionService.updateRule(props.rule.exerciseId, {
        enabled: form.enabled,
        sessionsAtTop: Number(form.sessionsAtTop),
        minRir: form.minRir === '' ? null : Number(form.minRir),
        loadIncrementKg: increment,
      }),
    )
  } catch (error) {
    errors.value = getFieldErrors(error)
    generalError.value = getErrorMessage(error)
  } finally {
    saving.value = false
  }
}

async function onReset() {
  saving.value = true
  try {
    onDialogOK(await progressionService.resetRule(props.rule.exerciseId))
  } catch (error) {
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
          <div class="text-h6">Regra de progressão</div>
          <div class="text-caption text-muted">{{ exerciseName }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-none">
          <div class="text-caption text-muted">
            Padrão (dupla progressão): quando todas as séries válidas chegam ao teto da faixa de
            repetições, com o RIR planejado e sem dor registrada, o app sugere aumentar a carga. A
            decisão é sempre sua.
          </div>
          <q-toggle v-model="form.enabled" label="Sugerir aumento de carga para este exercício" />
          <template v-if="form.enabled">
            <div>
              <div class="text-caption">Sessões seguidas no teto antes de sugerir</div>
              <q-btn-toggle
                v-model="form.sessionsAtTop"
                spread
                unelevated
                toggle-color="primary"
                :options="[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))"
              />
            </div>
            <div class="row q-col-gutter-sm">
              <q-input
                v-model.number="form.minRir"
                type="number"
                inputmode="numeric"
                min="0"
                max="10"
                label="RIR mínimo"
                hint="Vazio = RIR do plano"
                outlined
                class="col-6"
                :error="!!errors.minRir"
                :error-message="errors.minRir"
              />
              <q-input
                v-model="form.increment"
                type="number"
                inputmode="decimal"
                step="0.5"
                min="0"
                :label="`Incremento (${weightLabel[unit]})`"
                :hint="`Vazio = ${kgToDisplay(2.5, unit)} ${weightLabel[unit]}`"
                outlined
                class="col-6"
                :error="!!errors.loadIncrementKg"
                :error-message="errors.loadIncrementKg"
              />
            </div>
          </template>
          <div v-if="generalError && !Object.keys(errors).length" class="text-negative">
            {{ generalError }}
          </div>
        </q-card-section>
        <q-card-actions class="q-px-md q-pb-md">
          <q-btn
            v-if="rule.custom"
            flat
            no-caps
            label="Voltar ao padrão"
            :disable="saving"
            @click="onReset"
          />
          <q-space />
          <q-btn flat label="Cancelar" @click="onDialogCancel" />
          <q-btn type="submit" color="primary" unelevated label="Salvar" :loading="saving" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>
