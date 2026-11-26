<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useSettingsStore } from '@/stores/settings'
import { getErrorMessage } from '@/services/api'
import type { Settings } from '@/types/account'

const $q = useQuasar()
const store = useSettingsStore()
const settings = computed(() => store.settings)
const saving = ref(false)

const themeOptions = [
  { value: 'DARK', label: 'Escuro', icon: 'dark_mode' },
  { value: 'LIGHT', label: 'Claro', icon: 'light_mode' },
  { value: 'SYSTEM', label: 'Sistema', icon: 'brightness_auto' },
]
const weightOptions = [
  { value: 'KG', label: 'Quilos (kg)' },
  { value: 'LB', label: 'Libras (lb)' },
]
const lengthOptions = [
  { value: 'CM', label: 'Centímetros' },
  { value: 'IN', label: 'Polegadas' },
]
const restOptions = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map((seconds) => ({
  value: seconds,
  label: formatRest(seconds),
}))

const allTimezones: string[] =
  (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.(
    'timeZone',
  ) ?? []
const timezoneOptions = ref<string[]>(allTimezones)

function filterTimezones(value: string, update: (callback: () => void) => void) {
  update(() => {
    const needle = value.toLowerCase().replace(/\s+/g, '_')
    timezoneOptions.value = allTimezones.filter((zone) => zone.toLowerCase().includes(needle))
  })
}

function formatRest(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes === 0) return `${rest}s`
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest}s`
}

async function save(changes: Partial<Settings>) {
  saving.value = true
  try {
    await store.update(changes)
    $q.notify({ type: 'positive', message: 'Preferência salva', timeout: 1200 })
  } catch (error) {
    $q.notify({ type: 'negative', message: getErrorMessage(error) })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <q-page padding>
    <div class="page-container">
      <div v-if="!settings" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>

      <div v-else class="q-gutter-y-lg">
        <section>
          <div class="text-subtitle2 text-muted q-mb-sm">Tema</div>
          <q-btn-toggle
            :model-value="settings.theme"
            :options="themeOptions"
            :disable="saving"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            class="bordered-toggle"
            @update:model-value="(theme) => save({ theme })"
          />
        </section>

        <section>
          <div class="text-subtitle2 text-muted q-mb-sm">Peso e cargas</div>
          <q-btn-toggle
            :model-value="settings.weightUnit"
            :options="weightOptions"
            :disable="saving"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            class="bordered-toggle"
            @update:model-value="(weightUnit) => save({ weightUnit })"
          />
        </section>

        <section>
          <div class="text-subtitle2 text-muted q-mb-sm">Medidas corporais</div>
          <q-btn-toggle
            :model-value="settings.lengthUnit"
            :options="lengthOptions"
            :disable="saving"
            spread
            no-caps
            unelevated
            toggle-color="primary"
            class="bordered-toggle"
            @update:model-value="(lengthUnit) => save({ lengthUnit })"
          />
        </section>

        <section>
          <div class="text-subtitle2 text-muted q-mb-sm">Descanso entre séries</div>
          <q-select
            :model-value="settings.defaultRestSeconds"
            :options="restOptions"
            :disable="saving"
            emit-value
            map-options
            outlined
            label="Tempo padrão"
            hint="Usado quando o exercício não define um descanso próprio"
            @update:model-value="(defaultRestSeconds) => save({ defaultRestSeconds })"
          />
          <q-item tag="label" class="q-px-none q-mt-sm">
            <q-item-section>
              <q-item-label>Som ao terminar o descanso</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-toggle
                :model-value="settings.restSoundEnabled"
                :disable="saving"
                color="primary"
                @update:model-value="(restSoundEnabled) => save({ restSoundEnabled })"
              />
            </q-item-section>
          </q-item>
        </section>

        <section>
          <div class="text-subtitle2 text-muted q-mb-sm">Fuso horário</div>
          <q-select
            :model-value="settings.timezone"
            :options="timezoneOptions"
            :disable="saving"
            use-input
            fill-input
            hide-selected
            input-debounce="0"
            outlined
            hint="Define o dia e a semana dos treinos e relatórios"
            @filter="filterTimezones"
            @update:model-value="(timezone) => timezone && save({ timezone })"
          />
        </section>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.bordered-toggle {
  border: 1px solid var(--app-border);
}
</style>
