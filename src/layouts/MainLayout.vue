<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePageHeaderState } from '@/composables/usePageHeader'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const header = usePageHeaderState()
const auth = useAuthStore()

const title = computed(() => header.title.value ?? route.meta.title ?? 'Gym Work')
const back = computed(
  () => header.back.value ?? (route.meta.back ? { name: route.meta.back } : null),
)

/** Aba inferior destacada a partir da rota atual; o que não é das outras abas fica sob "Mais". */
const TAB_BY_ROUTE: Record<string, string> = {
  home: 'home',
  history: 'history',
  train: 'train',
  session: 'train',
  assessments: 'assessments',
  'assessment-new': 'assessments',
  'assessment-compare': 'assessments',
  assessment: 'assessments',
  'assessment-edit': 'assessments',
}
const activeTab = computed(() => TAB_BY_ROUTE[String(route.name)] ?? 'more')

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
      <div
        v-if="auth.offline && route.name !== 'session'"
        class="offline-bar row items-center no-wrap q-px-md q-py-xs"
      >
        <q-icon name="cloud_off" size="18px" class="q-mr-sm" />
        <span class="col text-caption">
          Sem conexão. O treino em andamento e as séries ficam salvos no aparelho e são enviados
          quando a internet voltar.
        </span>
      </div>
      <router-view />
    </q-page-container>

    <!-- Navegação inferior: alcançável com o polegar durante o treino -->
    <q-footer class="app-bar safe-bottom">
      <q-tabs
        no-caps
        dense
        active-color="primary"
        indicator-color="transparent"
        class="page-container text-muted bottom-tabs"
        :model-value="activeTab"
      >
        <q-tab name="home" icon="home" label="Início" @click="openTab('home')" />
        <q-tab name="history" icon="history" label="Histórico" @click="openTab('history')" />
        <q-tab
          name="train"
          icon="play_circle"
          label="Treinar"
          class="train-tab"
          @click="openTab('train')"
        />
        <q-tab
          name="assessments"
          icon="accessibility_new"
          label="Avaliação"
          @click="openTab('assessments')"
        />
        <q-tab name="more" icon="menu" label="Mais" @click="openTab('more')" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<style scoped>
.offline-bar {
  background: var(--q-warning);
  color: #1f2328;
}
/* 5 abas dividem a largura igualmente, mesmo em telas de 320 px */
.bottom-tabs :deep(.q-tab) {
  flex: 1 1 0;
  min-width: 0;
  padding: 0 2px;
}
.bottom-tabs :deep(.q-tab__label) {
  font-size: 12px;
}
.train-tab :deep(.q-tab__icon) {
  font-size: 30px;
  color: var(--q-primary);
}
</style>
