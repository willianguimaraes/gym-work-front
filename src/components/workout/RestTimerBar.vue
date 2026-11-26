<script setup lang="ts">
import { formatClock, useRestTimer } from '@/composables/useRestTimer'

const timer = useRestTimer()
</script>

<template>
  <transition name="rest-slide">
    <div
      v-if="timer.running.value"
      class="rest-bar"
      :class="{ 'rest-bar--done': timer.finished.value }"
    >
      <q-linear-progress
        :value="timer.progress.value"
        :color="timer.finished.value ? 'positive' : 'primary'"
        size="4px"
        class="rest-bar__progress"
      />
      <div class="row items-center no-wrap q-px-md q-py-sm page-container">
        <q-icon
          :name="timer.finished.value ? 'notifications_active' : 'timer'"
          size="28px"
          :color="timer.finished.value ? 'positive' : 'primary'"
        />
        <div class="col q-ml-sm">
          <div class="text-caption text-muted ellipsis">
            {{ timer.finished.value ? 'Descanso concluído' : 'Descanso' }}
            <template v-if="timer.state.value?.label"> · {{ timer.state.value.label }}</template>
          </div>
          <div class="rest-bar__clock">{{ formatClock(timer.remaining.value) }}</div>
        </div>
        <q-btn flat dense no-caps label="+15 s" class="q-mr-xs" @click="timer.add(15)" />
        <q-btn
          unelevated
          dense
          no-caps
          :color="timer.finished.value ? 'positive' : 'grey-8'"
          :label="timer.finished.value ? 'OK' : 'Pular'"
          class="q-px-md"
          @click="timer.stop()"
        />
      </div>
    </div>
  </transition>
</template>

<style scoped>
.rest-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(56px + env(safe-area-inset-bottom));
  z-index: 2000;
  background: var(--app-surface);
  border-top: 1px solid var(--app-border);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.25);
}
.rest-bar--done {
  border-top-color: var(--q-positive);
}
.rest-bar__progress {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
.rest-bar__clock {
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.rest-slide-enter-active,
.rest-slide-leave-active {
  transition: transform 0.2s ease;
}
.rest-slide-enter-from,
.rest-slide-leave-to {
  transform: translateY(100%);
}
</style>
