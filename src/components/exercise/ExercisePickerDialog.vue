<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import ExerciseBrowser from './ExerciseBrowser.vue'
import type { Exercise } from '@/types/exercise'

defineProps<{ title?: string }>()
defineEmits([...useDialogPluginComponent.emits])
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

function onSelect(exercise: Exercise) {
  onDialogOK(exercise)
}
</script>

<template>
  <q-dialog
    ref="dialogRef"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
    @hide="onDialogHide"
  >
    <q-card class="column no-wrap">
      <q-toolbar class="app-bar">
        <q-btn flat round dense icon="close" aria-label="Fechar" @click="onDialogCancel" />
        <q-toolbar-title class="text-weight-bold">{{
          title ?? 'Escolher exercício'
        }}</q-toolbar-title>
      </q-toolbar>
      <q-card-section class="col scroll">
        <div class="page-container">
          <ExerciseBrowser @select="onSelect" />
          <div class="text-caption text-muted text-center q-mt-md">
            Não encontrou? Cadastre um exercício personalizado em Mais → Catálogo de exercícios.
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
