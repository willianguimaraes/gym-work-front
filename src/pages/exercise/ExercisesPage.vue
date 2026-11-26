<script setup lang="ts">
import { useRouter } from 'vue-router'
import ExerciseBrowser from '@/components/exercise/ExerciseBrowser.vue'
import type { Exercise } from '@/types/exercise'

const router = useRouter()

function open(exercise: Exercise) {
  void router.push({ name: 'exercise', params: { id: exercise.id } })
}
</script>

<template>
  <q-page padding>
    <div class="page-container q-pb-xl">
      <ExerciseBrowser allow-inactive @select="open" />
    </div>

    <q-page-sticky position="bottom-right" :offset="[16, 16]">
      <q-btn
        fab
        color="primary"
        icon="add"
        aria-label="Novo exercício personalizado"
        :to="{ name: 'exercise-new' }"
      />
    </q-page-sticky>
  </q-page>
</template>
