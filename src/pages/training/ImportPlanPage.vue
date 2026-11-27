<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import ExercisePickerDialog from '@/components/exercise/ExercisePickerDialog.vue'
import QuickExerciseDialog from '@/components/exercise/QuickExerciseDialog.vue'
import { getErrorMessage } from '@/services/api'
import { trainingService } from '@/services/training.service'
import { useCatalogStore } from '@/stores/catalog'
import { useSettingsStore } from '@/stores/settings'
import type { Exercise } from '@/types/exercise'
import type {
  ExerciseMatch,
  ImportCandidate,
  PlanImportPreview,
  PlanSummary,
  PlanTemplate,
} from '@/types/training'
import { copyText } from '@/utils/files'
import { openDialog } from '@/utils/dialogs'
import { dayOfWeekLabel, equipmentLabel, formatRest, goalLabel } from '@/utils/labels'
import { kgToDisplay, weightLabel } from '@/utils/units'

type Template = NonNullable<PlanTemplate>
type TemplateExercise = Template['phases'][number]['days'][number]['exercises'][number]

const MAX_FILE = 200_000

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const settings = useSettingsStore()

const content = ref('')
const target = ref<'new' | 'existing'>('new')
const planId = ref<string | null>(null)
const plans = ref<PlanSummary[]>([])
/** Escolhas do usuário: nome como está no arquivo → ID do exercício. */
const choices = reactive<Record<string, string>>({})

const preview = ref<PlanImportPreview | null>(null)
const validating = ref(false)
const importing = ref(false)
const error = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const weightUnit = computed(() => settings.settings?.weightUnit ?? 'KG')
const planOptions = computed(() =>
  plans.value.map((plan) => ({ value: plan.id, label: plan.name })),
)
const pending = computed(
  () => preview.value?.exercises.filter((match) => !isResolved(match)).length ?? 0,
)
const totals = computed(() => {
  const phases = preview.value?.template?.phases ?? []
  const days = phases.reduce((sum, phase) => sum + phase.days.length, 0)
  const exercises = phases.reduce(
    (sum, phase) => sum + phase.days.reduce((total, day) => total + day.exercises.length, 0),
    0,
  )
  return { phases: phases.length, days, exercises }
})
const targetPlanId = computed(() => (target.value === 'existing' ? planId.value : null))

function isResolved(match: ExerciseMatch) {
  return match.status === 'MATCHED' || match.status === 'CHOSEN'
}

function request() {
  return { content: content.value, planId: targetPlanId.value, exercises: { ...choices } }
}

async function validate() {
  if (!content.value.trim()) {
    error.value = 'Cole o JSON ou escolha um arquivo.'
    return
  }
  if (target.value === 'existing' && !planId.value) {
    error.value = 'Escolha o planejamento que vai receber as fases.'
    return
  }
  validating.value = true
  error.value = ''
  try {
    preview.value = await trainingService.previewImport(request())
  } catch (e) {
    preview.value = null
    error.value = getErrorMessage(e)
  } finally {
    validating.value = false
  }
}

async function confirmImport() {
  importing.value = true
  error.value = ''
  try {
    const result = await trainingService.importPlan(request())
    $q.notify({
      type: 'positive',
      message: targetPlanId.value
        ? `${result.phaseIds.length === 1 ? 'Fase adicionada' : 'Fases adicionadas'} ao planejamento`
        : 'Planejamento importado como rascunho',
    })
    if (targetPlanId.value && result.phaseIds.length === 1) {
      await router.replace({ name: 'phase', params: { id: result.phaseIds[0] } })
    } else {
      await router.replace({ name: 'plan', params: { id: result.planId } })
    }
  } catch (e) {
    error.value = getErrorMessage(e)
    await validate()
  } finally {
    importing.value = false
  }
}

async function choose(match: ExerciseMatch, exerciseId: string) {
  choices[match.name] = exerciseId
  await validate()
}

async function search(match: ExerciseMatch) {
  const exercise = await openDialog<Exercise>($q, ExercisePickerDialog, {
    title: `Substituir "${match.name}"`,
  })
  if (exercise) await choose(match, exercise.id)
}

async function createCustom(match: ExerciseMatch) {
  const exercise = await openDialog<Exercise>($q, QuickExerciseDialog, { name: match.name })
  if (exercise) await choose(match, exercise.id)
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > MAX_FILE) {
    error.value = 'O arquivo é grande demais para um planejamento (máximo de 200 KB).'
    return
  }
  void file.text().then((text) => {
    content.value = text
    void validate()
  })
}

function clear() {
  content.value = ''
  preview.value = null
  error.value = ''
  for (const key of Object.keys(choices)) delete choices[key]
}

/** Lista de problemas para colar de volta no chat da IA, pedindo a correção. */
async function copyProblems() {
  const lines = (preview.value?.errors ?? []).map(
    (issue) => `- ${issue.path || 'arquivo'}: ${issue.message}`,
  )
  const text = `O JSON do planejamento (gymwork.plan/v1) tem estes problemas. Corrija e envie o JSON completo de novo:\n${lines.join('\n')}`
  if (await copyText(text)) $q.notify({ type: 'positive', message: 'Problemas copiados' })
}

function candidateLabel(candidate: ImportCandidate) {
  return `${candidate.name} · ${equipmentLabel[candidate.equipment]}`
}

function exerciseLine(item: TemplateExercise) {
  const parts = [
    `${item.sets} × ${item.repsMin === item.repsMax ? item.repsMin : `${item.repsMin}–${item.repsMax}`}`,
  ]
  if (item.restSeconds != null) parts.push(formatRest(item.restSeconds))
  if (item.targetRir != null) parts.push(`RIR ${item.targetRir}`)
  if (item.suggestedLoadKg != null) {
    parts.push(
      `${kgToDisplay(item.suggestedLoadKg, weightUnit.value)} ${weightLabel[weightUnit.value]}`,
    )
  }
  return parts.join(' · ')
}

function matchFor(name: string) {
  const key = normalize(name)
  return preview.value?.exercises.find((match) => normalize(match.name) === key)
}

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

// mudar o texto ou o destino invalida a pré-visualização
watch([content, target, planId], () => {
  preview.value = null
})

onMounted(async () => {
  void catalog.ensureLoaded()
  const fromQuery = typeof route.query.planId === 'string' ? route.query.planId : null
  if (fromQuery) {
    target.value = 'existing'
    planId.value = fromQuery
  }
  try {
    plans.value = await trainingService.listPlans()
  } catch {
    // a lista só serve para escolher o destino; sem ela, dá para importar como novo
  }
})
</script>

<template>
  <q-page padding>
    <div class="page-container q-gutter-y-md">
      <q-card flat bordered>
        <q-card-section class="q-gutter-y-sm">
          <div class="text-body2">
            Cole o JSON devolvido pela IA (formato <code>gymwork.plan/v1</code>) ou escolha um
            arquivo exportado. Nada é gravado até você confirmar, e planejamentos existentes não são
            alterados.
          </div>
          <q-input
            v-model="content"
            type="textarea"
            outlined
            label="JSON do planejamento"
            placeholder='{ "format": "gymwork.plan/v1", "plan": { … }, "phases": [ … ] }'
            input-class="json-input"
            :input-style="{ minHeight: '140px' }"
            autogrow
            maxlength="200000"
          />
          <div class="row q-gutter-sm">
            <q-btn
              outline
              no-caps
              color="primary"
              icon="upload_file"
              label="Escolher arquivo"
              @click="fileInput?.click()"
            />
            <q-btn v-if="content" flat no-caps icon="clear" label="Limpar" @click="clear" />
            <input
              ref="fileInput"
              type="file"
              accept=".json,.txt,.md,application/json,text/plain"
              class="hidden"
              @change="onFile"
            />
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-y-sm">
          <div class="text-subtitle2">Onde criar</div>
          <q-option-group
            v-model="target"
            :options="[
              { value: 'new', label: 'Novo planejamento (rascunho)' },
              { value: 'existing', label: 'Adicionar as fases a um planejamento' },
            ]"
            dense
          />
          <q-select
            v-if="target === 'existing'"
            v-model="planId"
            :options="planOptions"
            label="Planejamento"
            outlined
            dense
            emit-value
            map-options
          />
        </q-card-section>

        <q-card-actions class="q-px-md q-pb-md">
          <q-btn
            color="primary"
            unelevated
            no-caps
            icon="fact_check"
            label="Validar"
            class="full-width"
            :loading="validating"
            @click="validate"
          />
        </q-card-actions>
      </q-card>

      <q-banner v-if="error" rounded class="bg-negative text-white">{{ error }}</q-banner>

      <template v-if="preview">
        <!-- problemas que impedem a importação -->
        <q-card v-if="preview.errors.length" flat bordered class="border-negative">
          <q-card-section>
            <div class="row items-center no-wrap q-mb-sm">
              <q-icon name="error" color="negative" size="22px" class="q-mr-sm" />
              <div class="col text-subtitle1 text-weight-medium">
                {{ preview.errors.length }}
                {{ preview.errors.length === 1 ? 'problema' : 'problemas' }} no arquivo
              </div>
            </div>
            <q-list dense separator>
              <q-item
                v-for="issue in preview.errors"
                :key="issue.path + issue.message"
                class="q-px-none"
              >
                <q-item-section>
                  <q-item-label caption>{{ issue.location }}</q-item-label>
                  <q-item-label>{{ issue.message }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <div class="text-caption text-muted q-mt-sm">
              Corrija o JSON (ou peça para a IA corrigir) e valide de novo.
            </div>
          </q-card-section>
          <q-card-actions class="q-px-md q-pb-md">
            <q-btn
              outline
              no-caps
              color="primary"
              icon="content_copy"
              label="Copiar problemas para a IA"
              @click="copyProblems"
            />
          </q-card-actions>
        </q-card>

        <template v-if="preview.template">
          <!-- resumo -->
          <q-card flat bordered>
            <q-card-section>
              <div class="text-overline text-muted">
                {{ preview.targetPlan ? 'Novas fases em' : 'Novo planejamento' }}
              </div>
              <div class="text-h6">
                {{ preview.targetPlan?.name ?? preview.template.plan?.name }}
              </div>
              <div class="text-caption text-muted">
                <template v-if="!preview.targetPlan && preview.template.plan?.goal">
                  {{ goalLabel[preview.template.plan.goal] }} · rascunho ·
                </template>
                {{ totals.phases }} {{ totals.phases === 1 ? 'fase' : 'fases' }} · {{ totals.days }}
                {{ totals.days === 1 ? 'dia' : 'dias' }} · {{ totals.exercises }}
                {{ totals.exercises === 1 ? 'exercício' : 'exercícios' }}
              </div>
            </q-card-section>
          </q-card>

          <!-- exercícios casados com o catálogo -->
          <q-card flat bordered>
            <q-card-section class="q-pb-none">
              <div class="row items-center no-wrap">
                <div class="col text-subtitle1 text-weight-medium">Exercícios</div>
                <q-badge v-if="pending" color="warning" text-color="dark">
                  {{ pending }} para escolher
                </q-badge>
                <q-badge v-else color="positive">todos no catálogo</q-badge>
              </div>
            </q-card-section>
            <q-list separator>
              <q-item v-for="match in preview.exercises" :key="match.name">
                <q-item-section avatar top>
                  <q-icon
                    :name="isResolved(match) ? 'check_circle' : 'help'"
                    :color="isResolved(match) ? 'positive' : 'warning'"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ match.name }}</q-item-label>
                  <q-item-label v-if="match.exercise" caption>
                    {{ match.status === 'CHOSEN' ? 'Escolhido:' : 'No catálogo:' }}
                    {{ candidateLabel(match.exercise) }}
                    <span v-if="match.uses > 1"> · usado {{ match.uses }} vezes</span>
                  </q-item-label>
                  <template v-else>
                    <q-item-label caption>
                      {{
                        match.status === 'AMBIGUOUS'
                          ? 'Há mais de um exercício com esse nome. Qual é?'
                          : match.candidates.length
                            ? 'Não está no catálogo. É algum destes?'
                            : 'Não está no catálogo.'
                      }}
                    </q-item-label>
                    <div class="row q-gutter-xs q-mt-xs">
                      <q-chip
                        v-for="candidate in match.candidates"
                        :key="candidate.id"
                        clickable
                        outline
                        color="primary"
                        :label="candidateLabel(candidate)"
                        @click="choose(match, candidate.id)"
                      />
                    </div>
                  </template>
                  <div class="row q-gutter-sm q-mt-xs">
                    <q-btn
                      flat
                      dense
                      no-caps
                      size="sm"
                      color="primary"
                      icon="search"
                      :label="isResolved(match) ? 'Trocar' : 'Buscar no catálogo'"
                      @click="search(match)"
                    />
                    <q-btn
                      v-if="!isResolved(match)"
                      flat
                      dense
                      no-caps
                      size="sm"
                      color="primary"
                      icon="add"
                      label="Criar personalizado"
                      @click="createCustom(match)"
                    />
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>

          <!-- fases, dias e exercícios -->
          <q-card v-for="(phase, index) in preview.template.phases" :key="index" flat bordered>
            <q-card-section class="q-pb-sm">
              <div class="text-subtitle1 text-weight-medium">{{ phase.name }}</div>
              <div class="text-caption text-muted">
                {{ phase.weeks }} {{ phase.weeks === 1 ? 'semana' : 'semanas' }}
                <template v-if="phase.deloadWeeks.length">
                  · deload na {{ phase.deloadWeeks.length === 1 ? 'semana' : 'semanas' }}
                  {{ phase.deloadWeeks.join(', ') }}
                </template>
              </div>
              <div v-if="phase.notes" class="text-caption q-mt-xs pre-line">{{ phase.notes }}</div>
            </q-card-section>
            <q-list separator>
              <q-expansion-item
                v-for="(day, dayIndex) in phase.days"
                :key="dayIndex"
                dense
                :label="day.name"
                :caption="`${day.dayOfWeek ? dayOfWeekLabel[day.dayOfWeek] + ' · ' : ''}${day.exercises.length} ${day.exercises.length === 1 ? 'exercício' : 'exercícios'}`"
              >
                <q-list dense class="q-pb-sm">
                  <q-item v-for="(item, itemIndex) in day.exercises" :key="itemIndex">
                    <q-item-section>
                      <q-item-label>
                        {{ matchFor(item.exercise)?.exercise?.name ?? item.exercise }}
                        <q-icon
                          v-if="!matchFor(item.exercise)?.exercise"
                          name="help"
                          color="warning"
                          size="16px"
                        />
                      </q-item-label>
                      <q-item-label caption>{{ exerciseLine(item) }}</q-item-label>
                      <q-item-label v-if="item.notes" caption class="pre-line">{{
                        item.notes
                      }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-expansion-item>
            </q-list>
          </q-card>
        </template>

        <!-- avisos (não impedem a importação) -->
        <q-expansion-item
          v-if="preview.warnings.length"
          dense
          icon="info"
          :label="`${preview.warnings.length} ${preview.warnings.length === 1 ? 'aviso' : 'avisos'}`"
          header-class="text-muted"
        >
          <q-list dense>
            <q-item v-for="issue in preview.warnings" :key="issue.path + issue.message">
              <q-item-section>
                <q-item-label caption>{{ issue.location }}</q-item-label>
                <q-item-label>{{ issue.message }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-expansion-item>

        <q-btn
          v-if="preview.template"
          color="primary"
          unelevated
          no-caps
          size="lg"
          class="full-width"
          :icon="preview.targetPlan ? 'playlist_add' : 'download_done'"
          :label="preview.targetPlan ? 'Adicionar fases ao planejamento' : 'Importar como rascunho'"
          :disable="!preview.ready"
          :loading="importing"
          @click="confirmImport"
        />
        <div v-if="preview.template && !preview.ready" class="text-caption text-muted text-center">
          Escolha os exercícios que faltam para importar.
        </div>
      </template>
    </div>
  </q-page>
</template>

<style scoped>
:deep(.json-input) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.4;
}
.pre-line {
  white-space: pre-line;
}
.border-negative {
  border-color: var(--q-negative);
}
</style>
