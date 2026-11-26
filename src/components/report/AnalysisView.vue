<script setup lang="ts">
import { computed } from 'vue'
import type { AnalysisReport, ExerciseChange } from '@/types/report'
import { formatDate, trendColor, trendIcon } from '@/utils/labels'

/** Resumo de análise do período: frequência, tendência por exercício, faltas e desconfortos. */
const props = defineProps<{ analysis: AnalysisReport }>()

const groups = computed(() =>
  [
    { key: 'progressed', title: 'Evoluíram', items: props.analysis.progressed },
    { key: 'maintained', title: 'Mantiveram', items: props.analysis.maintained },
    { key: 'regressed', title: 'Caíram', items: props.analysis.regressed },
    { key: 'inconclusive', title: 'Sem comparação', items: props.analysis.inconclusive },
  ].filter((group) => group.items.length),
)

const frequency = computed(() => {
  const f = props.analysis.frequency
  const parts = [`${f.completedSessions} ${f.completedSessions === 1 ? 'sessão' : 'sessões'}`]
  if (f.plannedSessions != null) parts[0] += ` de ${f.plannedSessions} planejadas`
  if (f.sessionsPerWeek != null && f.weeks > 1)
    parts.push(`${String(f.sessionsPerWeek).replace('.', ',')} por semana`)
  if (f.inProgressSessions) parts.push(`${f.inProgressSessions} em andamento`)
  return parts.join(' · ')
})

function change(item: ExerciseChange): string {
  if (item.baselineSummary && item.latestSummary)
    return `${item.baselineSummary} → ${item.latestSummary}`
  return item.latestSummary ?? ''
}

const period = computed(() => {
  const { from, to } = props.analysis
  if (!from) return ''
  return from === to ? formatDate(from) : `${formatDate(from)} a ${formatDate(to)}`
})
</script>

<template>
  <div class="q-gutter-y-md">
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium">{{ analysis.title }}</div>
        <div v-if="period" class="text-caption text-muted">{{ period }}</div>
        <div class="q-mt-sm">{{ frequency }}</div>
        <div class="text-caption text-muted">
          {{ analysis.validSets }} séries válidas · {{ Math.round(analysis.volumeKg) }} kg de volume
          <template v-if="analysis.frequency.missedDays">
            · {{ analysis.frequency.missedDays }}
            {{ analysis.frequency.missedDays === 1 ? 'dia não feito' : 'dias não feitos' }}
          </template>
        </div>
      </q-card-section>
    </q-card>

    <div v-if="!groups.length" class="text-center text-muted q-pa-md">
      Nenhum exercício finalizado neste período.
    </div>
    <q-card v-for="group in groups" :key="group.key" flat bordered>
      <q-card-section class="q-pb-xs">
        <div class="text-subtitle2">{{ group.title }} ({{ group.items.length }})</div>
      </q-card-section>
      <q-list dense separator>
        <q-item v-for="item in group.items" :key="item.exerciseId">
          <q-item-section avatar>
            <q-icon
              :name="trendIcon[item.analysis.trend]"
              :color="trendColor[item.analysis.trend]"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ item.exerciseName }}</q-item-label>
            <q-item-label caption>{{ change(item) }}</q-item-label>
            <q-item-label v-if="item.analysis.trendDetail" caption class="text-muted">
              {{ item.analysis.trendDetail }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-card v-if="analysis.loadChanges.length || analysis.repChanges.length" flat bordered>
      <q-card-section>
        <div class="text-subtitle2 q-mb-xs">Alterações</div>
        <div v-for="line in analysis.loadChanges" :key="line" class="text-body2">
          <q-icon name="fitness_center" size="16px" class="q-mr-xs text-muted" />{{ line }}
        </div>
        <div v-for="line in analysis.repChanges" :key="line" class="text-body2">
          <q-icon name="repeat" size="16px" class="q-mr-xs text-muted" />{{ line }}
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="analysis.notPerformed.length" flat bordered>
      <q-card-section>
        <div class="text-subtitle2 q-mb-xs">Não realizado</div>
        <div v-for="(item, index) in analysis.notPerformed" :key="index" class="text-body2 q-mb-xs">
          <span class="text-muted">{{ item.when }}</span>
          <template v-if="item.exercise"> · {{ item.exercise }}</template
          >: {{ item.detail }}
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="analysis.discomforts.length" flat bordered>
      <q-card-section>
        <div class="text-subtitle2 q-mb-xs text-warning">
          <q-icon name="healing" class="q-mr-xs" />Desconfortos
        </div>
        <div v-for="(line, index) in analysis.discomforts" :key="index" class="text-body2 q-mb-xs">
          {{ line }}
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="analysis.observations.length" flat bordered>
      <q-card-section>
        <div class="text-subtitle2 q-mb-xs">Observações</div>
        <div v-for="(line, index) in analysis.observations" :key="index" class="text-body2 q-mb-xs">
          {{ line }}
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="analysis.volume.length" flat bordered>
      <q-card-section>
        <div class="text-subtitle2 q-mb-xs">Séries por grupo muscular</div>
        <div v-for="v in analysis.volume" :key="v.muscleGroup" class="row text-body2">
          <span class="col">{{ v.name }}</span>
          <span class="text-weight-medium">{{ v.sets }}</span>
          <span v-if="v.secondarySets" class="text-muted q-ml-xs">+{{ v.secondarySets }}</span>
        </div>
        <div class="text-caption text-muted q-mt-xs">
          "+N": séries em que o grupo trabalhou como secundário.
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>
