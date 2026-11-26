<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import PhotoImage from '@/components/assessment/PhotoImage.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { getErrorMessage } from '@/services/api'
import { assessmentService } from '@/services/assessment.service'
import { useSettingsStore } from '@/stores/settings'
import type { Assessment, Photo, PhotoPosition } from '@/types/assessment'
import { confirmAction } from '@/utils/dialogs'
import { formatDate, measurementLabel, options, photoPositionLabel } from '@/utils/labels'
import { prepareImage } from '@/utils/image'
import { cmToDisplay, kgToDisplay, lengthLabel, weightLabel } from '@/utils/units'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const weightUnit = computed(() => settings.settings?.weightUnit ?? 'KG')
const lengthUnit = computed(() => settings.settings?.lengthUnit ?? 'CM')

const assessment = ref<Assessment | null>(null)
const loading = ref(true)
const error = ref('')
const uploading = ref(false)
const uploadPosition = ref<PhotoPosition>('FRONT')
const fileInput = ref<HTMLInputElement | null>(null)
const positions = options(photoPositionLabel)

usePageHeader({
  title: computed(() =>
    assessment.value ? `Avaliação ${formatDate(assessment.value.assessedOn)}` : null,
  ),
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    assessment.value = await assessmentService.get(String(route.params.id))
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(() => route.params.id, load, { immediate: true })

const hasValues = computed(() => {
  const a = assessment.value
  return (
    !!a &&
    (a.weightKg != null || a.bodyFatPct != null || a.heightCm != null || a.measurements.length > 0)
  )
})

function pickFile(position: PhotoPosition) {
  uploadPosition.value = position
  fileInput.value?.click()
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const current = assessment.value
  if (!file || !current) return
  uploading.value = true
  try {
    const { blob, name } = await prepareImage(file)
    const photo = await assessmentService.uploadPhoto(current.id, blob, name, uploadPosition.value)
    current.photos.push(photo)
    $q.notify({ type: 'positive', message: 'Foto adicionada', timeout: 1500 })
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  } finally {
    uploading.value = false
  }
}

function photoMenu(photo: Photo) {
  $q.dialog({
    title: photoPositionLabel[photo.position],
    options: {
      type: 'radio',
      model: photo.position,
      items: positions.map((p) => ({ label: p.label, value: p.value })),
    },
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Mudar posição', color: 'primary', unelevated: true },
  }).onOk(async (position: PhotoPosition) => {
    try {
      const updated = await assessmentService.movePhoto(photo.id, position)
      if (assessment.value) {
        assessment.value.photos = assessment.value.photos.map((p) =>
          p.id === updated.id ? updated : p,
        )
      }
    } catch (e) {
      $q.notify({ type: 'negative', message: getErrorMessage(e) })
    }
  })
}

async function removePhoto(photo: Photo) {
  const ok = await confirmAction($q, {
    title: 'Excluir foto',
    message: 'A foto será apagada definitivamente.',
    ok: 'Excluir',
  })
  if (!ok || !assessment.value) return
  try {
    await assessmentService.deletePhoto(photo.id)
    assessment.value.photos = assessment.value.photos.filter((p) => p.id !== photo.id)
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  }
}

async function remove() {
  const current = assessment.value
  if (!current) return
  const ok = await confirmAction($q, {
    title: 'Excluir avaliação',
    message: 'A avaliação, as medidas e as fotos serão apagadas definitivamente.',
    ok: 'Excluir',
  })
  if (!ok) return
  try {
    await assessmentService.remove(current.id)
    $q.notify({ type: 'positive', message: 'Avaliação excluída' })
    await router.replace({ name: 'assessments' })
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  }
}
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>
      <q-banner v-else-if="error" rounded class="bg-negative text-white">{{ error }}</q-banner>

      <template v-else-if="assessment">
        <q-card flat bordered>
          <q-card-section class="row items-start no-wrap">
            <div class="col">
              <div class="text-h6">{{ formatDate(assessment.assessedOn) }}</div>
              <div v-if="!hasValues" class="text-muted">Sem valores registrados.</div>
            </div>
            <q-btn flat round dense icon="more_vert" aria-label="Ações da avaliação">
              <q-menu auto-close>
                <q-list style="min-width: 180px">
                  <q-item
                    clickable
                    :to="{ name: 'assessment-edit', params: { id: assessment.id } }"
                  >
                    <q-item-section avatar><q-icon name="edit" /></q-item-section>
                    <q-item-section>Editar</q-item-section>
                  </q-item>
                  <q-item
                    clickable
                    :to="{ name: 'assessment-compare', query: { b: assessment.id } }"
                  >
                    <q-item-section avatar><q-icon name="compare" /></q-item-section>
                    <q-item-section>Comparar</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item clickable class="text-negative" @click="remove">
                    <q-item-section avatar><q-icon name="delete" /></q-item-section>
                    <q-item-section>Excluir</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-card-section>

          <q-list v-if="hasValues" dense separator class="q-pb-sm">
            <q-item v-if="assessment.weightKg != null">
              <q-item-section>Peso</q-item-section>
              <q-item-section side class="text-weight-bold">
                {{ kgToDisplay(assessment.weightKg, weightUnit) }} {{ weightLabel[weightUnit] }}
              </q-item-section>
            </q-item>
            <q-item v-if="assessment.bodyFatPct != null">
              <q-item-section>Gordura corporal</q-item-section>
              <q-item-section side class="text-weight-bold"
                >{{ assessment.bodyFatPct }}%</q-item-section
              >
            </q-item>
            <q-item v-if="assessment.heightCm != null">
              <q-item-section>Altura</q-item-section>
              <q-item-section side class="text-weight-bold">
                {{ cmToDisplay(assessment.heightCm, lengthUnit) }} {{ lengthLabel[lengthUnit] }}
              </q-item-section>
            </q-item>
            <q-item v-for="m in assessment.measurements" :key="m.type">
              <q-item-section>{{ measurementLabel[m.type] }}</q-item-section>
              <q-item-section side class="text-weight-bold">
                {{ cmToDisplay(m.valueCm, lengthUnit) }} {{ lengthLabel[lengthUnit] }}
              </q-item-section>
            </q-item>
          </q-list>
          <q-card-section v-if="assessment.notes" class="pre-line q-pt-none">
            {{ assessment.notes }}
          </q-card-section>
        </q-card>

        <div>
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle1 text-weight-medium col">Fotos</div>
            <q-btn
              flat
              dense
              no-caps
              color="primary"
              icon="add_a_photo"
              label="Adicionar"
              :loading="uploading"
            >
              <q-menu auto-close>
                <q-list>
                  <q-item
                    v-for="p in positions"
                    :key="p.value"
                    clickable
                    @click="pickFile(p.value)"
                  >
                    <q-item-section>{{ p.label }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="onFile"
          />
          <div v-if="!assessment.photos.length" class="text-caption text-muted text-center q-pa-md">
            Sem fotos. Elas ficam privadas e só aparecem para você.
          </div>
          <div class="row q-col-gutter-sm">
            <div v-for="photo in assessment.photos" :key="photo.id" class="col-6">
              <div class="relative-position">
                <PhotoImage :photo="photo" />
                <div class="photo-bar row items-center no-wrap">
                  <span class="col text-caption text-white ellipsis q-pl-sm">
                    {{ photoPositionLabel[photo.position] }}
                  </span>
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    icon="swap_horiz"
                    color="white"
                    @click="photoMenu(photo)"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    icon="delete"
                    color="white"
                    @click="removePhoto(photo)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </q-page>
</template>

<style scoped>
.photo-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  border-radius: 0 0 4px 4px;
}
</style>
