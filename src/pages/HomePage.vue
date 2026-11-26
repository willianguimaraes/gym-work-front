<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const firstName = computed(() => auth.user?.name.split(' ')[0] ?? '')
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <div class="text-h6">Olá, {{ firstName }} 👋</div>

      <q-card flat bordered>
        <q-card-section class="row items-center no-wrap q-gutter-md">
          <q-icon name="fitness_center" size="40px" color="primary" />
          <div>
            <div class="text-subtitle1 text-weight-medium">Nenhum treino ainda</div>
            <div class="text-caption text-muted">Seus treinos vão aparecer aqui.</div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>
