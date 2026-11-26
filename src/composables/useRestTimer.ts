import { computed, ref } from 'vue'

/**
 * Cronômetro de descanso compartilhado pelo app. Guarda o horário de término (não um contador),
 * então continua certo depois de recarregar a página ou com a tela bloqueada.
 */
const STORAGE_KEY = 'gymwork.restTimer'

interface TimerState {
  endsAt: number
  total: number
  label: string
}

const state = ref<TimerState | null>(load())
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined
let soundEnabled = true
let finishedHandled = false

function load(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as TimerState) : null
    return parsed && parsed.endsAt > Date.now() - 60_000 ? parsed : null
  } catch {
    return null
  }
}

function persist() {
  try {
    if (state.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // armazenamento indisponível (modo privado): o cronômetro segue só em memória
  }
}

function beep() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    ;[0, 0.25, 0.5].forEach((offset) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.25, ctx.currentTime + offset)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.2)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + offset)
      osc.stop(ctx.currentTime + offset + 0.2)
    })
    setTimeout(() => void ctx.close(), 1000)
  } catch {
    // sem áudio disponível
  }
}

function tick() {
  now.value = Date.now()
  if (!state.value) return
  if (now.value >= state.value.endsAt && !finishedHandled) {
    finishedHandled = true
    if (soundEnabled) beep()
    navigator.vibrate?.([200, 100, 200])
  }
}

function ensureTicking() {
  ticker ??= setInterval(tick, 250)
}

if (state.value) ensureTicking()

export function useRestTimer() {
  const remaining = computed(() =>
    state.value ? Math.max(0, Math.ceil((state.value.endsAt - now.value) / 1000)) : 0,
  )
  const running = computed(() => !!state.value)
  const finished = computed(() => !!state.value && remaining.value === 0)
  const progress = computed(() =>
    state.value ? 1 - remaining.value / Math.max(1, state.value.total) : 0,
  )

  function start(seconds: number, label = '', options: { sound?: boolean } = {}) {
    soundEnabled = options.sound ?? true
    if (seconds <= 0) {
      stop()
      return
    }
    finishedHandled = false
    state.value = { endsAt: Date.now() + seconds * 1000, total: seconds, label }
    now.value = Date.now()
    persist()
    ensureTicking()
  }

  function add(seconds: number) {
    if (!state.value) return
    const base = Math.max(state.value.endsAt, Date.now())
    finishedHandled = false
    state.value = {
      ...state.value,
      endsAt: base + seconds * 1000,
      total: state.value.total + seconds,
    }
    persist()
  }

  function stop() {
    state.value = null
    persist()
    if (ticker) {
      clearInterval(ticker)
      ticker = undefined
    }
  }

  return { state, remaining, running, finished, progress, start, add, stop }
}

export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
