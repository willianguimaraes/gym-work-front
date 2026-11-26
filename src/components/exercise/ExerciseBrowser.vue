<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { exerciseService } from '@/services/exercise.service'
import { getErrorMessage } from '@/services/api'
import { useCatalogStore } from '@/stores/catalog'
import type { Exercise, ExerciseScope } from '@/types/exercise'
import { equipmentLabel } from '@/utils/labels'

/** Busca no catálogo com filtros e paginação "carregar mais". Emite o exercício tocado. */
const props = defineProps<{
  /** Mostra também os exercícios desativados (só faz sentido na tela do catálogo). */
  allowInactive?: boolean
}>()

const emit = defineEmits<{ select: [exercise: Exercise] }>()

const catalog = useCatalogStore()

const PAGE_SIZE = 30
const filters = reactive({
  search: '',
  muscleGroup: null as string | null,
  scope: 'ALL' as ExerciseScope,
  includeInactive: false,
})
const items = ref<Exercise[]>([])
const page = ref(0)
const total = ref(0)
const loading = ref(false)
const error = ref('')
let requestId = 0

const scopes: { value: ExerciseScope; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'GLOBAL', label: 'Do sistema' },
  { value: 'MINE', label: 'Meus' },
]

async function load(reset: boolean) {
  const current = ++requestId
  loading.value = true
  error.value = ''
  try {
    const nextPage = reset ? 0 : page.value + 1
    const result = await exerciseService.search({
      search: filters.search.trim(),
      muscleGroup: filters.muscleGroup,
      scope: filters.scope,
      includeInactive: props.allowInactive && filters.includeInactive,
      page: nextPage,
      size: PAGE_SIZE,
    })
    if (current !== requestId) return // resposta de uma busca antiga
    items.value = reset ? result.content : [...items.value, ...result.content]
    page.value = result.page
    total.value = result.totalElements
  } catch (e) {
    if (current === requestId) error.value = getErrorMessage(e)
  } finally {
    if (current === requestId) loading.value = false
  }
}

let debounce: ReturnType<typeof setTimeout> | undefined
watch(
  () => filters.search,
  () => {
    clearTimeout(debounce)
    debounce = setTimeout(() => load(true), 300)
  },
)
watch(
  () => [filters.muscleGroup, filters.scope, filters.includeInactive],
  () => load(true),
)

onMounted(async () => {
  await catalog.ensureLoaded().catch(() => undefined)
  await load(true)
})

defineExpose({ reload: () => load(true) })
</script>

<template>
  <div class="q-gutter-y-sm">
    <q-input
      v-model="filters.search"
      outlined
      dense
      clearable
      placeholder="Buscar exercício"
      @clear="filters.search = ''"
    >
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <q-select
      v-model="filters.muscleGroup"
      :options="catalog.muscleOptions"
      label="Grupo muscular"
      outlined
      dense
      emit-value
      map-options
      clearable
    />
    <q-btn-toggle
      v-model="filters.scope"
      :options="scopes"
      spread
      no-caps
      unelevated
      dense
      toggle-color="primary"
      class="scope-toggle"
    />

    <q-toggle
      v-if="allowInactive"
      v-model="filters.includeInactive"
      label="Mostrar desativados"
      dense
    />

    <q-banner v-if="error" rounded class="bg-negative text-white">{{ error }}</q-banner>

    <q-list v-if="items.length" bordered separator class="rounded-borders">
      <q-item
        v-for="exercise in items"
        :key="exercise.id"
        clickable
        @click="emit('select', exercise)"
      >
        <q-item-section>
          <q-item-label :class="{ 'text-muted': !exercise.active }">{{
            exercise.name
          }}</q-item-label>
          <q-item-label caption>
            {{ catalog.muscleName(exercise.primaryMuscleGroup) }} ·
            {{ equipmentLabel[exercise.equipment] }}
          </q-item-label>
        </q-item-section>
        <q-item-section side class="row no-wrap items-center">
          <q-badge v-if="!exercise.active" color="grey-7" label="Desativado" />
          <q-badge v-else-if="exercise.custom" outline color="primary" label="Meu" />
        </q-item-section>
      </q-item>
    </q-list>

    <div v-else-if="!loading && !error" class="text-center text-muted q-pa-lg">
      Nenhum exercício encontrado.
    </div>

    <div class="flex flex-center q-py-sm">
      <q-spinner v-if="loading" color="primary" size="28px" />
      <q-btn
        v-else-if="items.length < total"
        flat
        no-caps
        color="primary"
        :label="`Carregar mais (${total - items.length})`"
        @click="load(false)"
      />
    </div>
  </div>
</template>

<style scoped>
.scope-toggle :deep(.q-btn) {
  padding: 6px 10px;
}
</style>
