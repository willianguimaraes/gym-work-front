<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
import { getErrorMessage } from '@/services/api'
import { rules } from '@/utils/validation'

const auth = useAuthStore()
const router = useRouter()
const $q = useQuasar()

const form = reactive({ name: '', email: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await auth.register(form)
    $q.notify({ type: 'positive', message: 'Conta criada! Bons treinos 💪' })
    await router.replace({ name: 'home' })
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
      v-model="form.name"
      label="Nome"
      autocomplete="name"
      outlined
      :rules="[rules.required, rules.maxLength(120)]"
    >
      <template #prepend><q-icon name="person" /></template>
    </q-input>

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
      hint="Mínimo de 8 caracteres"
      autocomplete="new-password"
      outlined
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

    <q-btn
      type="submit"
      label="Criar conta"
      color="primary"
      size="lg"
      class="full-width"
      unelevated
      :loading="loading"
    />

    <div class="text-center">
      Já tem conta?
      <router-link :to="{ name: 'login' }" class="text-primary text-weight-medium">
        Entrar
      </router-link>
    </div>
  </q-form>
</template>
