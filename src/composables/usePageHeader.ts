import { onUnmounted, ref, shallowRef, watchEffect, type Ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

/** Título e destino do "voltar" definidos pela página atual (ex.: nome do plano carregado). */
const title = ref<string | null>(null)
const back = shallowRef<RouteLocationRaw | null>(null)
let owner: symbol | null = null

export function usePageHeaderState() {
  return { title, back }
}

/**
 * Usada pelas páginas cujo título ou rota de volta dependem dos dados carregados. Os valores
 * são limpos quando a página sai de cena (só se outra página ainda não os tiver assumido).
 */
export function usePageHeader(options: {
  title?: Ref<string | null | undefined>
  back?: Ref<RouteLocationRaw | null | undefined>
}) {
  const me = Symbol('page-header')
  watchEffect(() => {
    owner = me
    title.value = options.title?.value || null
    back.value = options.back?.value ?? null
  })
  onUnmounted(() => {
    if (owner !== me) return
    owner = null
    title.value = null
    back.value = null
  })
}
