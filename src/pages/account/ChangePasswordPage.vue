<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { accountService } from '@/services/account.service'
import { getErrorMessage, getFieldErrors } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { rules } from '@/utils/validation'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ currentPassword: '', newPassword: '', confirm: '' })
const errors = ref<Record<string, string>>({})
const showPassword = ref(false)
const saving = ref(false)

const matches = (value: string) => value === form.newPassword || 'As senhas não conferem'

async function onSubmit() {
  saving.value = true
  errors.value = {}
  try {
    const session = await accountService.changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })
    auth.applySession(session)
    $q.notify({
      type: 'positive',
      message: 'Senha alterada. Os outros dispositivos foram desconectados.',
    })
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
      <q-form class="q-gutter-y-md" @submit="onSubmit">
        <q-input
          v-model="form.currentPassword"
          :type="showPassword ? 'text' : 'password'"
          label="Senha atual"
          autocomplete="current-password"
          outlined
          :rules="[rules.required]"
          :error="!!errors.currentPassword"
          :error-message="errors.currentPassword"
        >
          <template #append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <q-input
          v-model="form.newPassword"
          :type="showPassword ? 'text' : 'password'"
          label="Nova senha"
          hint="Mínimo de 8 caracteres"
          autocomplete="new-password"
          outlined
          :rules="[rules.required, rules.minLength(8), rules.maxLength(72)]"
          :error="!!errors.newPassword"
          :error-message="errors.newPassword"
        />

        <q-input
          v-model="form.confirm"
          :type="showPassword ? 'text' : 'password'"
          label="Confirme a nova senha"
          autocomplete="new-password"
          outlined
          :rules="[rules.required, matches]"
        />

        <q-btn
          type="submit"
          label="Alterar senha"
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
