<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { authService } from '@/services/auth.service'
import { getErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { rules } from '@/utils/validation'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const auth = useAuthStore()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const form = reactive({ password: '', confirm: '' })
const showPassword = ref(false)
const loading = ref(false)

const matches = (value: string) => value === form.password || 'As senhas não conferem'

async function onSubmit() {
  loading.value = true
  try {
    await authService.resetPassword({ token: token.value, newPassword: form.password })
    // A redefinição encerra todas as sessões, inclusive a deste navegador
    auth.clearSession()
    $q.notify({ type: 'positive', message: 'Senha alterada. Entre com a nova senha.' })
    await router.replace({ name: 'login' })
  } catch (error) {
    $q.notify({ type: 'negative', message: getErrorMessage(error) })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="!token" class="q-gutter-y-md text-center">
    <q-icon name="link_off" size="48px" color="negative" />
    <div class="text-subtitle1">Link inválido</div>
    <p class="text-muted">Abra o link exatamente como recebido no e-mail ou peça um novo.</p>
    <q-btn
      :to="{ name: 'forgot-password' }"
      label="Pedir novo link"
      color="primary"
      unelevated
      size="lg"
      class="full-width"
    />
  </div>

  <q-form v-else class="q-gutter-y-md" @submit="onSubmit">
    <div class="text-subtitle1">Criar nova senha</div>

    <q-input
      v-model="form.password"
      :type="showPassword ? 'text' : 'password'"
      label="Nova senha"
      hint="Mínimo de 8 caracteres"
      autocomplete="new-password"
      outlined
      autofocus
      :rules="[rules.required, rules.minLength(8), rules.maxLength(72)]"
    >
      <template #prepend><q-icon name="lock" /></template>
      <template #append>
        <q-icon
          :name="showPassword ? 'visibility_off' : 'visibility'"
          class="cursor-pointer"
          @click="showPassword = !showPassword"
        />
      </template>
    </q-input>

    <q-input
      v-model="form.confirm"
      :type="showPassword ? 'text' : 'password'"
      label="Confirme a nova senha"
      autocomplete="new-password"
      outlined
      :rules="[rules.required, matches]"
    >
      <template #prepend><q-icon name="lock" /></template>
    </q-input>

    <q-btn
      type="submit"
      label="Salvar nova senha"
      color="primary"
      size="lg"
      class="full-width"
      unelevated
      :loading="loading"
    />
  </q-form>
</template>
