<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/services/api'
import { rules } from '@/utils/validation'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const $q = useQuasar()

const form = reactive({ email: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await auth.login(form)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (error) {
    $q.notify({ type: 'negative', message: getErrorMessage(error) })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <q-form class="q-gutter-y-md" @submit="onSubmit">
    <q-input
      v-model="form.email"
      type="email"
      label="E-mail"
      autocomplete="email"
      inputmode="email"
      outlined
      :rules="[rules.required, rules.email]"
    >
      <template #prepend><q-icon name="mail" /></template>
    </q-input>

    <q-input
      v-model="form.password"
      :type="showPassword ? 'text' : 'password'"
      label="Senha"
      autocomplete="current-password"
      outlined
      :rules="[rules.required]"
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

    <q-btn
      type="submit"
      label="Entrar"
      color="primary"
      size="lg"
      class="full-width"
      unelevated
      :loading="loading"
    />

    <div class="text-center">
      Não tem conta?
      <router-link :to="{ name: 'register' }" class="text-primary text-weight-medium">
        Cadastre-se
      </router-link>
    </div>
  </q-form>
</template>
