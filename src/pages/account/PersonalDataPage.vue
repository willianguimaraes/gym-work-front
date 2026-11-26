<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { accountService } from '@/services/account.service'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { cmToDisplay, displayToCm, lengthLabel } from '@/utils/units'
import { rules } from '@/utils/validation'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()
const settingsStore = useSettingsStore()

const lengthUnit = computed(() => settingsStore.settings?.lengthUnit ?? 'CM')

const form = reactive({ name: '', height: '' as string | number, birthDate: '' })
const errors = ref<Record<string, string>>({})
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')

onMounted(async () => {
  try {
    const profile = await accountService.getProfile()
    form.name = profile.name
    form.height = profile.heightCm == null ? '' : cmToDisplay(profile.heightCm, lengthUnit.value)
    form.birthDate = profile.birthDate ?? ''
  } catch (error) {
    loadError.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
})

async function onSubmit() {
  saving.value = true
  errors.value = {}
  try {
    const height = form.height === '' ? null : Number(form.height)
    const profile = await accountService.updateProfile({
      name: form.name,
      heightCm: height == null ? null : displayToCm(height, lengthUnit.value),
      birthDate: form.birthDate || null,
    })
    if (auth.user) auth.user = { ...auth.user, name: profile.name }
    $q.notify({ type: 'positive', message: 'Dados salvos' })
    await router.push({ name: 'profile' })
  } catch (error) {
    errors.value = getFieldErrors(error)
    $q.notify({ type: 'negative', message: getErrorMessage(error) })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <q-banner v-else-if="loadError" rounded class="bg-negative text-white">
        {{ loadError }}
      </q-banner>

      <q-form v-else class="q-gutter-y-md" @submit="onSubmit">
        <q-input
          v-model="form.name"
          label="Nome"
          autocomplete="name"
          outlined
          :rules="[rules.required, rules.maxLength(120)]"
          :error="!!errors.name"
          :error-message="errors.name"
        />

        <q-input
          v-model="form.height"
          type="number"
          inputmode="decimal"
          step="0.1"
          :label="`Altura (${lengthLabel[lengthUnit]})`"
          hint="Opcional"
          outlined
          :error="!!errors.heightCm"
          :error-message="errors.heightCm"
        />

        <q-input
          v-model="form.birthDate"
          type="date"
          label="Data de nascimento"
          stack-label
          hint="Opcional"
          outlined
          :error="!!errors.birthDate"
          :error-message="errors.birthDate"
        />

        <q-btn
          type="submit"
          label="Salvar"
          color="primary"
          size="lg"
          class="full-width"
          unelevated
          :loading="saving"
        />
      </q-form>
    </div>
  </q-page>
</template>
