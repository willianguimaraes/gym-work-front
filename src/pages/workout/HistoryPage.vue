<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getErrorMessage } from '@/services/api'
import { workoutService } from '@/services/workout.service'
import type { SessionSummary } from '@/types/workout'
import { formatDateTime, formatDuration } from '@/utils/labels'

/** Histórico de sessões, mais recentes primeiro, com "carregar mais". */
const router = useRouter()

const items = ref<SessionSummary[]>([])
const page = ref(0)
const total = ref(0)
const loading = ref(false)
const error = ref('')

async function load(reset: boolean) {
  loading.value = true
  error.value = ''
  try {
    const next = reset ? 0 : page.value + 1
    const result = await workoutService.history(next, 20)
    items.value = reset ? result.content : [...items.value, ...result.content]
    page.value = result.page
    total.value = result.totalElements
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => load(true))
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <q-banner v-if="error" rounded class="bg-negative text-white">
        {{ error }}
        <template #action><q-btn flat label="Tentar de novo" @click="load(true)" /></template>
      </q-banner>

      <div v-if="!loading && !error && !items.length" class="text-center q-pa-xl">
        <q-icon name="history" size="48px" color="grey-6" />
        <div class="text-subtitle1 q-mt-sm">Nenhum treino registrado</div>
        <q-btn flat color="primary" no-caps label="Começar um treino" :to="{ name: 'train' }" />
      </div>

      <q-list v-if="items.length" bordered separator class="rounded-borders">
        <q-item
          v-for="item in items"
          :key="item.id"
          clickable
          @click="router.push({ name: 'session', params: { id: item.id } })"
        >
          <q-item-section>
            <q-item-label class="text-weight-medium">
              {{ item.dayName ?? 'Treino avulso' }}
              <q-badge
                v-if="item.status === 'IN_PROGRESS'"
                color="primary"
                label="Em andamento"
                class="q-ml-xs"
              />
            </q-item-label>
            <q-item-label caption>
              {{ formatDateTime(item.startedAt) }} ·
              {{ formatDuration(item.startedAt, item.finishedAt) }}
            </q-item-label>
            <q-item-label v-if="item.planName" caption class="ellipsis">
              {{ item.planName }} · {{ item.phaseName }}
              <template v-if="item.weekNumber"> · Semana {{ item.weekNumber }}</template>
            </q-item-label>
          </q-item-section>
          <q-item-section side class="text-right">
            <q-item-label class="text-weight-bold">{{ item.completedSets }}</q-item-label>
            <q-item-label caption>{{ item.completedSets === 1 ? 'série' : 'séries' }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <div class="flex flex-center">
        <q-spinner v-if="loading" color="primary" size="32px" />
        <q-btn
          v-else-if="items.length < total"
          flat
          no-caps
          color="primary"
          :label="`Carregar mais (${total - items.length})`"
          @click="load(false)"
        />
      </div>
    </div>
  </q-page>
</template>
