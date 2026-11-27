<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import { exerciseService } from '@/services/exercise.service'
import { useCatalogStore } from '@/stores/catalog'
import type { Equipment, ExerciseType } from '@/types/exercise'
import { equipmentLabel, exerciseTypeLabel, options } from '@/utils/labels'
import { rules } from '@/utils/validation'

/** Cadastro rápido de um exercício personalizado (usado na importação de planejamento). */
const props = defineProps<{ name?: string }>()

defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const catalog = useCatalogStore()
const form = reactive({
  name: props.name ?? '',
  primaryMuscleGroup: null as string | null,
  type: 'COMPOUND' as ExerciseType,
  equipment: 'MACHINE' as Equipment,
})
const errors = ref<Record<string, string>>({})
const generalError = ref('')
const saving = ref(false)
const equipments = options(equipmentLabel)
const types = options(exerciseTypeLabel)

async function onSubmit() {
  saving.value = true
  errors.value = {}
  generalError.value = ''
  try {
    const exercise = await exerciseService.create({
      name: form.name,
      primaryMuscleGroup: form.primaryMuscleGroup ?? '',
      secondaryMuscleGroups: [],
      type: form.type,
      equipment: form.equipment,
      description: null,
      instructions: null,
    })
    onDialogOK(exercise)
  } catch (error) {
    errors.value = getFieldErrors(error)
    generalError.value = getErrorMessage(error)
  } finally {
    saving.value = false
  }
}

onMounted(() => catalog.ensureLoaded())
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <q-card class="dialog-card">
      <q-form @submit="onSubmit">
        <q-card-section class="text-h6">Novo exercício personalizado</q-card-section>

        <q-card-section class="q-gutter-y-md q-pt-none">
          <q-input
            v-model="form.name"
            label="Nome"
            outlined
            :rules="[rules.required, rules.maxLength(120)]"
            :error="!!errors.name"
            :error-message="errors.name"
          />
          <q-select
            v-model="form.primaryMuscleGroup"
            :options="catalog.muscleOptions"
            label="Grupo muscular principal"
            outlined
            emit-value
            map-options
            :rules="[rules.required]"
            :error="!!errors.primaryMuscleGroup"
            :error-message="errors.primaryMuscleGroup"
          />
          <div class="row q-col-gutter-sm">
            <q-select
              v-model="form.equipment"
              :options="equipments"
              label="Equipamento"
              outlined
              emit-value
              map-options
              class="col-6"
            />
            <q-select
              v-model="form.type"
              :options="types"
              label="Tipo"
              outlined
              emit-value
              map-options
              class="col-6"
            />
          </div>
          <div class="text-caption text-muted">
            Descrição e instruções podem ser completadas depois no catálogo.
          </div>
          <div v-if="generalError && !Object.keys(errors).length" class="text-negative">
            {{ generalError }}
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Cancelar" @click="onDialogCancel" />
          <q-btn type="submit" color="primary" unelevated label="Criar" :loading="saving" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>
