<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { usePageHeader } from '@/composables/usePageHeader'
import { getErrorMessage } from '@/services/api'
import { exerciseService } from '@/services/exercise.service'
import { useCatalogStore } from '@/stores/catalog'
import type { Exercise } from '@/types/exercise'
import { equipmentLabel, exerciseTypeLabel } from '@/utils/labels'

const $q = useQuasar()
const route = useRoute()
const catalog = useCatalogStore()

const exercise = ref<Exercise | null>(null)
const loading = ref(true)
const error = ref('')
const busy = ref(false)

usePageHeader({ title: computed(() => exercise.value?.name) })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [loaded] = await Promise.all([
      exerciseService.get(String(route.params.id)),
      catalog.ensureLoaded().catch(() => undefined),
    ])
    exercise.value = loaded
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, load, { immediate: true })

const secondaries = computed(() =>
  (exercise.value?.secondaryMuscleGroups ?? []).map((code) => catalog.muscleName(code)).join(', '),
)

async function toggleActive() {
  const current = exercise.value
  if (!current) return
  busy.value = true
  try {
    exercise.value = await exerciseService.setActive(current.id, !current.active)
    $q.notify({
      type: 'positive',
      message: exercise.value.active ? 'Exercício reativado' : 'Exercício desativado',
    })
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <q-banner v-else-if="error" rounded class="bg-negative text-white">{{ error }}</q-banner>

      <template v-else-if="exercise">
        <q-card flat bordered>
          <q-card-section>
            <div class="row q-gutter-xs q-mb-xs">
              <q-badge v-if="exercise.custom" outline color="primary" label="Personalizado" />
              <q-badge v-else outline color="grey-6" label="Do sistema" />
              <q-badge v-if="!exercise.active" color="grey-7" label="Desativado" />
            </div>
            <div class="text-h6">{{ exercise.name }}</div>
          </q-card-section>
          <q-separator />
          <q-list dense class="q-py-sm">
            <q-item>
              <q-item-section class="text-muted">Grupo principal</q-item-section>
              <q-item-section side class="text-body2">{{
                catalog.muscleName(exercise.primaryMuscleGroup)
              }}</q-item-section>
            </q-item>
            <q-item v-if="secondaries">
              <q-item-section class="text-muted">Secundários</q-item-section>
              <q-item-section side class="text-body2">{{ secondaries }}</q-item-section>
            </q-item>
            <q-item>
              <q-item-section class="text-muted">Equipamento</q-item-section>
              <q-item-section side class="text-body2">{{
                equipmentLabel[exercise.equipment]
              }}</q-item-section>
            </q-item>
            <q-item>
              <q-item-section class="text-muted">Tipo</q-item-section>
              <q-item-section side class="text-body2">{{
                exerciseTypeLabel[exercise.type]
              }}</q-item-section>
            </q-item>
          </q-list>
          <template v-if="exercise.description || exercise.instructions">
            <q-separator />
            <q-card-section class="q-gutter-y-sm">
              <div v-if="exercise.description" class="pre-line">{{ exercise.description }}</div>
              <div v-if="exercise.instructions">
                <div class="text-caption text-muted">Como executar</div>
                <div class="pre-line">{{ exercise.instructions }}</div>
              </div>
            </q-card-section>
          </template>
        </q-card>

        <template v-if="exercise.custom">
          <q-btn
            color="primary"
            unelevated
            icon="edit"
            label="Editar"
            size="lg"
            class="full-width"
            :to="{ name: 'exercise-edit', params: { id: exercise.id } }"
          />
          <q-btn
            outline
            :color="exercise.active ? 'negative' : 'positive'"
            :icon="exercise.active ? 'block' : 'check_circle'"
            :label="exercise.active ? 'Desativar' : 'Reativar'"
            class="full-width"
            :loading="busy"
            @click="toggleActive"
          />
          <div class="text-caption text-muted text-center">
            Exercícios não são apagados, para não perder planos e históricos. Desativado, ele some
            das buscas, mas continua nos planos em que já está.
          </div>
        </template>
      </template>
    </div>
  </q-page>
</template>
