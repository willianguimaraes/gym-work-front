<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { authService } from '@/services/auth.service'
import { getErrorMessage } from '@/services/api'
import { rules } from '@/utils/validation'

const $q = useQuasar()

const email = ref('')
const loading = ref(false)
const sent = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await authService.forgotPassword(email.value)
    sent.value = true
  } catch (error) {
    $q.notify({ type: 'negative', message: getErrorMessage(error) })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="sent" class="q-gutter-y-md text-center">
    <q-icon name="mark_email_read" size="48px" color="positive" />
    <div class="text-subtitle1">Verifique seu e-mail</div>
    <p class="text-muted">
      Se existir uma conta para <strong>{{ email }}</strong>, você vai receber um link para criar
      uma nova senha. O link vale por 30 minutos.
    </p>
    <q-btn
      :to="{ name: 'login' }"
      label="Voltar ao login"
      color="primary"
      unelevated
      size="lg"
      class="full-width"
    />
  </div>

  <q-form v-else class="q-gutter-y-md" @submit="onSubmit">
    <div class="text-subtitle1">Esqueceu a senha?</div>
    <p class="text-muted q-mb-none">
      Informe seu e-mail e enviaremos um link para você criar uma nova senha.
    </p>

    <q-input
      v-model="email"
      type="email"
      label="E-mail"
      autocomplete="email"
      inputmode="email"
      outlined
      autofocus
      :rules="[rules.required, rules.email]"
    >
      <template #prepend><q-icon name="mail" /></template>
    </q-input>

    <q-btn
      type="submit"
      label="Enviar link"
      color="primary"
      size="lg"
      class="full-width"
      unelevated
      :loading="loading"
    />

    <div class="text-center">
      <router-link :to="{ name: 'login' }" class="text-primary">Voltar ao login</router-link>
    </div>
  </q-form>
</template>
