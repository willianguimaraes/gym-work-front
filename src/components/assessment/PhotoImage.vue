<script setup lang="ts">
import { ref, watch } from 'vue'
import { assessmentService } from '@/services/assessment.service'
import type { Photo } from '@/types/assessment'

/**
 * Foto privada. A URL assinada vale 5 minutos; se a imagem falhar ao carregar (URL vencida),
 * pede uma nova à API uma vez.
 */
const props = defineProps<{ photo: Photo; ratio?: number }>()

const src = ref(props.photo.url)
const retried = ref(false)
const failed = ref(false)

watch(
  () => props.photo.url,
  (url) => {
    src.value = url
    retried.value = false
    failed.value = false
  },
)

async function onError() {
  if (retried.value) {
    failed.value = true
    return
  }
  retried.value = true
  try {
    src.value = (await assessmentService.photoUrl(props.photo.id)).url
  } catch {
    failed.value = true
  }
}
</script>

<template>
  <q-img
    v-if="!failed"
    :src="src"
    :ratio="ratio ?? 3 / 4"
    fit="cover"
    spinner-color="primary"
    class="rounded-borders photo"
    @error="onError"
  />
  <div v-else class="photo photo--failed flex flex-center rounded-borders text-muted">
    <q-icon name="broken_image" size="32px" />
  </div>
</template>

<style scoped>
.photo {
  background: var(--app-border);
}
.photo--failed {
  aspect-ratio: 3 / 4;
}
</style>
