<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { applyTheme, getStoredTheme, type ThemeMode } from '@/utils/theme'

const auth = useAuthStore()
const router = useRouter()
const $q = useQuasar()

const theme = ref<ThemeMode>(getStoredTheme())
const themeOptions = [
  { value: 'dark', label: 'Escuro', icon: 'dark_mode' },
  { value: 'light', label: 'Claro', icon: 'light_mode' },
  { value: 'system', label: 'Sistema', icon: 'brightness_auto' },
]
watch(theme, applyTheme)

function confirmLogout() {
  $q.dialog({
    title: 'Sair',
    message: 'Deseja realmente sair da sua conta?',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Sair', color: 'negative', unelevated: true },
  }).onOk(async () => {
    auth.logout()
    await router.replace({ name: 'login' })
  })
}
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <q-list bordered separator class="rounded-borders">
        <q-item>
          <q-item-section avatar><q-icon name="person" /></q-item-section>
          <q-item-section>
            <q-item-label caption>Nome</q-item-label>
            <q-item-label>{{ auth.user?.name }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section avatar><q-icon name="mail" /></q-item-section>
          <q-item-section>
            <q-item-label caption>E-mail</q-item-label>
            <q-item-label>{{ auth.user?.email }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <div>
        <div class="text-subtitle2 text-muted q-mb-sm">Tema</div>
        <q-btn-toggle
          v-model="theme"
          :options="themeOptions"
          spread
          no-caps
          unelevated
          toggle-color="primary"
          class="theme-toggle"
        />
      </div>

      <q-btn
        label="Sair"
        icon="logout"
        color="negative"
        outline
        size="lg"
        class="full-width"
        @click="confirmLogout"
      />
    </div>
  </q-page>
</template>

<style scoped>
.theme-toggle {
  border: 1px solid var(--app-border);
}
</style>
