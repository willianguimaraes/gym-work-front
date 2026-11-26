<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { usePageHeader } from '@/composables/usePageHeader'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import { exerciseService } from '@/services/exercise.service'
import { useCatalogStore } from '@/stores/catalog'
import type { Equipment, ExerciseType } from '@/types/exercise'
import { equipmentLabel, exerciseTypeLabel, options } from '@/utils/labels'
import { rules } from '@/utils/validation'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()

const editingId = computed(() => (route.params.id ? String(route.params.id) : null))

const form = reactive({
  name: '',
  primaryMuscleGroup: null as string | null,
  secondaryMuscleGroups: [] as string[],
  type: 'COMPOUND' as ExerciseType,
  equipment: 'MACHINE' as Equipment,
  description: '',
  instructions: '',
})
const errors = ref<Record<string, string>>({})
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)

const equipments = options(equipmentLabel)
const types = options(exerciseTypeLabel)
const secondaryOptions = computed(() =>
  catalog.muscleOptions.filter((option) => option.value !== form.primaryMuscleGroup),
)

usePageHeader({
  back: computed(() =>
    editingId.value ? { name: 'exercise', params: { id: editingId.value } } : { name: 'exercises' },
  ),
})

onMounted(async () => {
  try {
    await catalog.ensureLoaded()
    if (editingId.value) {
      const exercise = await exerciseService.get(editingId.value)
      Object.assign(form, {
        name: exercise.name,
        primaryMuscleGroup: exercise.primaryMuscleGroup,
        secondaryMuscleGroups: exercise.secondaryMuscleGroups,
        type: exercise.type,
        equipment: exercise.equipment,
        description: exercise.description ?? '',
        instructions: exercise.instructions ?? '',
      })
    }
  } catch (e) {
    loadError.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
})

async function onSubmit() {
  saving.value = true
  errors.value = {}
  try {
    const payload = {
      name: form.name,
      primaryMuscleGroup: form.primaryMuscleGroup ?? '',
      secondaryMuscleGroups: form.secondaryMuscleGroups.filter(
        (code) => code !== form.primaryMuscleGroup,
      ),
      type: form.type,
      equipment: form.equipment,
      description: form.description || null,
      instructions: form.instructions || null,
    }
    const saved = editingId.value
      ? await exerciseService.update(editingId.value, payload)
      : await exerciseService.create(payload)
    $q.notify({ type: 'positive', message: 'Exercício salvo' })
    await router.replace({ name: 'exercise', params: { id: saved.id } })
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
          v-model="form.name"
          label="Nome"
          placeholder="Ex.: Supino inclinado articulado"
          outlined
          :autofocus="!editingId"
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
          :rules="[(v: string | null) => !!v || 'Campo obrigatório']"
          :error="!!errors.primaryMuscleGroup"
          :error-message="errors.primaryMuscleGroup"
        />
        <q-select
          v-model="form.secondaryMuscleGroups"
          :options="secondaryOptions"
          label="Grupos secundários (opcional)"
          outlined
          multiple
          use-chips
          emit-value
          map-options
          :error="!!errors.secondaryMuscleGroups"
          :error-message="errors.secondaryMuscleGroups"
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
        <q-input
          v-model="form.description"
          type="textarea"
          label="Descrição (opcional)"
          outlined
          autogrow
          :rules="[rules.maxLength(1000)]"
        />
        <q-input
          v-model="form.instructions"
          type="textarea"
          label="Como executar (opcional)"
          outlined
          autogrow
          :rules="[rules.maxLength(4000)]"
        />
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
