<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { accountService } from '@/services/account.service'
import { getErrorMessage } from '@/services/api'

const auth = useAuthStore()
const settings = useSettingsStore()
const router = useRouter()
const $q = useQuasar()

const initials = computed(() =>
  (auth.user?.name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(''),
)

async function leave(message?: string) {
  settings.reset()
  await router.replace({ name: 'login' })
  if (message) $q.notify({ type: 'info', message })
}

function confirmLogout() {
  $q.dialog({
    title: 'Sair',
    message: 'Deseja sair da sua conta neste dispositivo?',
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Sair', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await auth.logout()
    } finally {
      await leave()
    }
  })
}

function confirmDeleteAccount() {
  $q.dialog({
    title: 'Excluir conta',
    message:
      'Todos os seus dados (treinos, avaliações e fotos) serão apagados permanentemente. ' +
      'Essa ação não pode ser desfeita. Digite sua senha para confirmar.',
    prompt: { model: '', type: 'password', outlined: true, label: 'Senha' },
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Excluir conta', color: 'negative', unelevated: true },
    persistent: true,
  }).onOk(async (password: string) => {
    if (!password) return
    $q.loading.show()
    try {
      await accountService.deleteAccount(password)
      auth.clearSession()
      await leave('Sua conta foi excluída.')
    } catch (error) {
      $q.notify({ type: 'negative', message: getErrorMessage(error) })
    } finally {
      $q.loading.hide()
    }
  })
}
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <div class="row items-center no-wrap q-gutter-md q-py-sm">
        <q-avatar size="56px" color="primary" text-color="white" class="text-weight-bold">
          {{ initials }}
        </q-avatar>
        <div class="ellipsis">
          <div class="text-h6 ellipsis">{{ auth.user?.name }}</div>
          <div class="text-muted ellipsis">{{ auth.user?.email }}</div>
        </div>
      </div>

      <q-list bordered separator class="rounded-borders">
        <q-item clickable :to="{ name: 'personal-data' }">
          <q-item-section avatar><q-icon name="badge" /></q-item-section>
          <q-item-section>Dados pessoais</q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>
        <q-item clickable :to="{ name: 'preferences' }">
          <q-item-section avatar><q-icon name="tune" /></q-item-section>
          <q-item-section>
            <q-item-label>Preferências</q-item-label>
            <q-item-label caption>Tema, unidades, descanso</q-item-label>
          </q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>
        <q-item clickable :to="{ name: 'change-password' }">
          <q-item-section avatar><q-icon name="lock_reset" /></q-item-section>
          <q-item-section>Alterar senha</q-item-section>
          <q-item-section side><q-icon name="chevron_right" /></q-item-section>
        </q-item>
      </q-list>

      <q-btn
        label="Sair"
        icon="logout"
        color="negative"
        outline
        size="lg"
        class="full-width"
        @click="confirmLogout"
      />

      <div class="text-center q-pt-lg">
        <q-btn
          flat
          no-caps
          dense
          color="negative"
          icon="delete_forever"
          label="Excluir minha conta"
          @click="confirmDeleteAccount"
        />
      </div>
    </div>
  </q-page>
</template>
