import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { exerciseService } from '@/services/exercise.service'
import type { MuscleGroup } from '@/types/exercise'

/** Dados de referência do catálogo (grupos musculares), carregados uma vez por sessão. */
export const useCatalogStore = defineStore('catalog', () => {
  const muscleGroups = ref<MuscleGroup[]>([])
  let loading: Promise<void> | null = null

  function ensureLoaded(): Promise<void> {
    if (muscleGroups.value.length) return Promise.resolve()
    loading ??= exerciseService
      .muscleGroups()
      .then((groups) => {
        muscleGroups.value = groups
      })
      .finally(() => {
        loading = null
      })
    return loading
  }

  const muscleName = computed(() => {
    const names = new Map(muscleGroups.value.map((group) => [group.code, group.name]))
    return (code: string) => names.get(code) ?? code
  })

  const muscleOptions = computed(() =>
    muscleGroups.value.map((group) => ({ value: group.code, label: group.name })),
  )

  return { muscleGroups, ensureLoaded, muscleName, muscleOptions }
})
