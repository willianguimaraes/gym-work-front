<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import AnalysisView from '@/components/report/AnalysisView.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { getErrorMessage } from '@/services/api'
import { reportService } from '@/services/report.service'
import type { AnalysisReport, DownloadedFile, ReportFormat, ReportScope } from '@/types/report'
import { copyText, saveFile } from '@/utils/files'

/** Relatório de sessão, semana ou fase: texto para copiar/baixar, análise e (fase) pacote para IA. */
const $q = useQuasar()
const route = useRoute()

const scope = computed(() => route.params.scope as ReportScope)
const id = computed(() => String(route.params.id))

const tab = ref<'text' | 'analysis' | 'ai'>('text')
const text = ref('')
const analysis = ref<AnalysisReport | null>(null)
const aiText = ref('')
const loading = ref(true)
const error = ref('')
const busy = ref<string | null>(null)

const scopeTitle: Record<ReportScope, string> = {
  sessao: 'Relatório da sessão',
  semana: 'Relatório da semana',
  fase: 'Relatório da fase',
}

usePageHeader({
  title: computed(() => analysis.value?.title ?? scopeTitle[scope.value]),
  back: computed(() =>
    scope.value === 'sessao' ? { name: 'session', params: { id: id.value } } : { name: 'reports' },
  ),
})

async function load() {
  loading.value = true
  error.value = ''
  aiText.value = ''
  tab.value = route.query.tab === 'ai' && scope.value === 'fase' ? 'ai' : 'text'
  try {
    const [report, summary] = await Promise.all([
      reportService.text(scope.value, id.value),
      reportService.analysis(scope.value, id.value),
    ])
    text.value = report
    analysis.value = summary
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch([scope, id], load, { immediate: true })

watch(tab, async (value) => {
  if (value !== 'ai' || aiText.value) return
  try {
    aiText.value = await reportService.aiPackageText(id.value)
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  }
})

async function copy(content: string, message: string) {
  const ok = await copyText(content)
  $q.notify(
    ok
      ? { type: 'positive', message, timeout: 1500 }
      : { type: 'negative', message: 'Não foi possível copiar. Use o botão de baixar.' },
  )
}

async function download(key: string, request: () => Promise<DownloadedFile>) {
  busy.value = key
  try {
    const file = await request()
    if (!saveFile(file))
      $q.notify({ type: 'negative', message: 'O navegador bloqueou o download.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: getErrorMessage(e) })
  } finally {
    busy.value = null
  }
}

function downloadReport(format: ReportFormat) {
  void download(format, () => reportService.file(scope.value, id.value, format))
}

const formats: { format: ReportFormat; label: string; icon: string }[] = [
  { format: 'txt', label: 'TXT', icon: 'description' },
  { format: 'pdf', label: 'PDF', icon: 'picture_as_pdf' },
  { format: 'csv', label: 'CSV', icon: 'table_view' },
]
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md q-pb-xl">
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner size="40px" color="primary" />
      </div>
      <q-banner v-else-if="error" rounded class="bg-negative text-white">
        {{ error }}
        <template #action><q-btn flat label="Tentar de novo" @click="load" /></template>
      </q-banner>

      <template v-else>
        <q-tabs
          v-model="tab"
          dense
          no-caps
          align="justify"
          active-color="primary"
          indicator-color="primary"
          class="text-muted"
        >
          <q-tab name="text" label="Relatório" />
          <q-tab name="analysis" label="Análise" />
          <q-tab v-if="scope === 'fase'" name="ai" label="Pacote para IA" />
        </q-tabs>

        <template v-if="tab === 'text'">
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-btn
                color="primary"
                unelevated
                no-caps
                icon="content_copy"
                label="Copiar relatório"
                class="full-width"
                @click="copy(text, 'Relatório copiado')"
              />
            </div>
            <div v-for="f in formats" :key="f.format" class="col-4 col-sm-2">
              <q-btn
                outline
                color="primary"
                no-caps
                :icon="f.icon"
                :label="f.label"
                class="full-width"
                :loading="busy === f.format"
                :aria-label="`Baixar ${f.label}`"
                @click="downloadReport(f.format)"
              />
            </div>
          </div>
          <q-card flat bordered>
            <pre class="report-text q-ma-none q-pa-md">{{ text }}</pre>
          </q-card>
        </template>

        <AnalysisView v-else-if="tab === 'analysis' && analysis" :analysis="analysis" />

        <template v-else-if="tab === 'ai'">
          <q-card flat bordered>
            <q-card-section class="text-body2">
              Leva o plano atual, a execução semana a semana, a análise, os desconfortos, as
              avaliações físicas e os exercícios do catálogo, com uma instrução pedindo o próximo
              plano no formato <code>gymwork.plan/v1</code>. Cole no chat da IA ou envie o arquivo.
            </q-card-section>
          </q-card>
          <div class="row q-col-gutter-sm">
            <div class="col-12">
              <q-btn
                color="primary"
                unelevated
                no-caps
                icon="content_copy"
                label="Copiar pacote (Markdown)"
                class="full-width"
                :disable="!aiText"
                @click="copy(aiText, 'Pacote copiado')"
              />
            </div>
            <div class="col-6">
              <q-btn
                outline
                color="primary"
                no-caps
                icon="download"
                label="Baixar .md"
                class="full-width"
                :loading="busy === 'md'"
                @click="download('md', () => reportService.aiPackageFile(id, 'md'))"
              />
            </div>
            <div class="col-6">
              <q-btn
                outline
                color="primary"
                no-caps
                icon="data_object"
                label="Baixar .json"
                class="full-width"
                :loading="busy === 'json'"
                @click="download('json', () => reportService.aiPackageFile(id, 'json'))"
              />
            </div>
            <div class="col-12">
              <q-btn
                flat
                color="primary"
                no-caps
                icon="schema"
                label="Só o template da fase (JSON)"
                class="full-width"
                :loading="busy === 'template'"
                @click="download('template', () => reportService.phaseTemplate(id))"
              />
            </div>
          </div>
          <div v-if="!aiText" class="flex flex-center q-pa-lg">
            <q-spinner size="32px" color="primary" />
          </div>
          <q-card v-else flat bordered>
            <pre class="report-text ai-text q-ma-none q-pa-md">{{ aiText }}</pre>
          </q-card>
        </template>
      </template>
    </div>
  </q-page>
</template>

<style scoped>
.report-text {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}
.ai-text {
  max-height: 60vh;
  overflow-y: auto;
  font-size: 12px;
}
</style>
