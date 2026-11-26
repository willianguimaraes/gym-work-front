<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => route.meta.title ?? 'Gym Work')
const back = computed(() => route.meta.back)
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="app-bar">
      <q-toolbar>
        <q-btn
          v-if="back"
          flat
          round
          dense
          icon="arrow_back"
          aria-label="Voltar"
          :to="{ name: back }"
          class="q-mr-sm"
        />
        <q-icon v-else name="fitness_center" color="primary" size="24px" class="q-mr-sm" />
        <q-toolbar-title class="text-weight-bold">{{ title }}</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Navegação inferior: alcançável com o polegar durante o treino -->
    <q-footer class="app-bar safe-bottom">
      <q-tabs
        no-caps
        dense
        active-color="primary"
        indicator-color="transparent"
        class="page-container text-muted"
      >
        <q-route-tab :to="{ name: 'home' }" exact icon="home" label="Início" />
        <q-route-tab :to="{ name: 'profile' }" icon="person" label="Perfil" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>
