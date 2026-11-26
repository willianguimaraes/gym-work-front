<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import type { Analysis } from '@/types/progression'
import { suggestionIcon, suggestionLabel, trendColor, trendIcon, trendLabel } from '@/utils/labels'
import { kgToDisplay, weightLabel } from '@/utils/units'

/** Tendência + sugestão da análise de progressão. Sugestões são só informativas. */
const props = defineProps<{ analysis: Analysis; compact?: boolean }>()

const settings = useSettingsStore()
const unit = computed(() => settings.settings?.weightUnit ?? 'KG')

const suggestionColor = computed(() => {
  switch (props.analysis.suggestion) {
    case 'INCREASE_LOAD':
      return 'positive'
    case 'HOLD_PAIN':
      return 'negative'
    case 'REVIEW_PERFORMANCE':
    case 'REVIEW_RIR':
      return 'warning'
    default:
      return 'primary'
  }
})
</script>

<template>
  <div class="q-gutter-y-xs">
    <div class="row items-center q-gutter-x-sm">
      <q-chip
        dense
        :color="trendColor[analysis.trend]"
        text-color="white"
        :icon="trendIcon[analysis.trend]"
        class="q-ml-none"
      >
        {{ trendLabel[analysis.trend] }}
      </q-chip>
      <q-chip
        v-if="analysis.suggestion !== 'NONE'"
        dense
        outline
        :color="suggestionColor"
        :icon="suggestionIcon[analysis.suggestion]"
      >
        {{ suggestionLabel[analysis.suggestion] }}
        <template v-if="analysis.suggestedLoadKg != null">
          · {{ kgToDisplay(analysis.suggestedLoadKg, unit) }} {{ weightLabel[unit] }}
        </template>
      </q-chip>
    </div>
    <div v-if="!compact" class="text-body2">{{ analysis.trendDetail }}</div>
    <div v-if="analysis.message" class="text-caption text-muted">{{ analysis.message }}</div>
  </div>
</template>
