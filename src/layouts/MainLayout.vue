<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePageHeaderState } from '@/composables/usePageHeader'

const route = useRoute()
const router = useRouter()
const header = usePageHeaderState()

const title = computed(() => header.title.value ?? route.meta.title ?? 'Gym Work')
const back = computed(
  () => header.back.value ?? (route.meta.back ? { name: route.meta.back } : null),
)

/** Aba inferior destacada: Início só na própria tela; o resto fica sob "Mais". */
const activeTab = computed(() => (route.name === 'home' ? 'home' : 'more'))

function openTab(tab: string) {
  void router.push({ name: tab })
}
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
          :to="back"
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
        :model-value="activeTab"
      >
        <q-tab name="home" icon="home" label="Início" @click="openTab('home')" />
        <q-tab name="more" icon="menu" label="Mais" @click="openTab('more')" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>
