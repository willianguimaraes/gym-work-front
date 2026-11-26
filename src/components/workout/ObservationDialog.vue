<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import type {
  BodyRegion,
  BodySide,
  Observation,
  ObservationCategory,
  ObservationMoment,
  ObservationRequest,
} from '@/types/workout'
import {
  bodyRegionLabel,
  bodySideLabel,
  categoryIcon,
  categoryLabel,
  momentLabel,
  options,
} from '@/utils/labels'
import { rules } from '@/utils/validation'

/**
 * Registro de observação. Dor e desconforto pedem região, lado, intensidade e momento. É só um
 * registro: o app não interpreta nem sugere tratamento.
 */
const props = defineProps<{
  /** Nome do exercício relacionado, se houver (só exibição). */
  exerciseName?: string | null
  observation?: Observation | null
  /** Categorias oferecidas (padrão: todas). */
  categories?: ObservationCategory[]
  save: (payload: ObservationRequest) => Promise<unknown>
}>()

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const o = props.observation
const form = reactive({
  category: (o?.category ?? props.categories?.[0] ?? 'PAIN') as ObservationCategory,
  bodyRegion: (o?.bodyRegion ?? null) as BodyRegion | null,
  bodySide: (o?.bodySide ?? null) as BodySide | null,
  intensity: (o?.intensity ?? null) as number | null,
  moment: (o?.moment ?? 'DURING') as ObservationMoment | null,
  interrupted: o?.interrupted ?? false,
  text: o?.text ?? '',
})
const errors = ref<Record<string, string>>({})
const generalError = ref('')
const saving = ref(false)

const categoryOptions = computed(() =>
  (props.categories ?? (Object.keys(categoryLabel) as ObservationCategory[])).map((value) => ({
    value,
    label: categoryLabel[value],
    icon: categoryIcon[value],
  })),
)
const bodyRelated = computed(() => form.category === 'PAIN' || form.category === 'DISCOMFORT')
const regions = options(bodyRegionLabel)
const sides = options(bodySideLabel)
const moments = options(momentLabel)

const intensityLabel = computed(() => {
  if (bodyRelated.value) return 'Intensidade percebida (0 a 10)'
  if (form.category === 'SLEEP') return 'Qualidade do sono (0 a 10)'
  if (form.category === 'ENERGY') return 'Nível de energia (0 a 10)'
  return 'Intensidade (0 a 10, opcional)'
})

async function onSubmit() {
  saving.value = true
  errors.value = {}
  generalError.value = ''
  try {
    const body = bodyRelated.value
    const result = await props.save({
      category: form.category,
      bodyRegion: body ? form.bodyRegion : null,
      bodySide: body ? form.bodySide : null,
      intensity: form.intensity,
      moment: form.moment,
      interrupted: body ? form.interrupted : false,
      text: form.text || null,
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
          <div class="text-h6">{{ observation ? 'Editar observação' : 'Nova observação' }}</div>
          <div v-if="exerciseName" class="text-caption text-muted">{{ exerciseName }}</div>
        </q-card-section>

        <q-card-section class="q-gutter-y-md q-pt-none">
          <div class="row q-gutter-xs">
            <q-chip
              v-for="option in categoryOptions"
              :key="option.value"
              clickable
              :icon="option.icon"
              :outline="form.category !== option.value"
              :color="form.category === option.value ? 'primary' : undefined"
              :text-color="form.category === option.value ? 'white' : undefined"
              @click="form.category = option.value"
            >
              {{ option.label }}
            </q-chip>
          </div>

          <template v-if="bodyRelated">
            <div class="row q-col-gutter-sm">
              <q-select
                v-model="form.bodyRegion"
                :options="regions"
                label="Região do corpo"
                outlined
                emit-value
                map-options
                class="col-7"
                :rules="[(v: string | null) => !!v || 'Informe a região']"
                :error="!!errors.bodyRegion"
                :error-message="errors.bodyRegion"
              />
              <q-select
                v-model="form.bodySide"
                :options="sides"
                label="Lado"
                outlined
                emit-value
                map-options
                clearable
                class="col-5"
              />
            </div>
            <q-select
              v-model="form.moment"
              :options="moments"
              label="Quando"
              outlined
              emit-value
              map-options
              clearable
            />
            <q-toggle v-model="form.interrupted" label="Precisei interromper o exercício" />
          </template>

          <div>
            <div class="text-caption text-muted">{{ intensityLabel }}</div>
            <q-slider
              v-model="form.intensity"
              :min="0"
              :max="10"
              markers
              label-always
              switch-label-side
              color="primary"
              class="q-px-sm"
            />
            <q-btn
              v-if="form.intensity != null"
              flat
              dense
              no-caps
              size="sm"
              label="Sem intensidade"
              @click="form.intensity = null"
            />
          </div>

          <q-input
            v-model="form.text"
            type="textarea"
            label="Descrição"
            outlined
            autogrow
            :rules="[rules.maxLength(2000)]"
            :error="!!errors.text"
            :error-message="errors.text"
          />
          <div v-if="bodyRelated" class="text-caption text-muted">
            Este registro aparece nos relatórios e é levado em conta na análise de progressão do
            exercício. O app não faz diagnóstico; em caso de dor persistente, procure um
            profissional de saúde.
          </div>
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
