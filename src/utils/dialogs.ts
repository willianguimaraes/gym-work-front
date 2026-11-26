import type { QVueGlobals } from 'quasar'

/** Confirmação antes de ações destrutivas. Resolve `true` se o usuário confirmar. */
export function confirmAction(
  $q: QVueGlobals,
  options: { title: string; message: string; ok: string; danger?: boolean },
): Promise<boolean> {
  return new Promise((resolve) => {
    $q.dialog({
      title: options.title,
      message: options.message,
      cancel: { label: 'Cancelar', flat: true },
      ok: {
        label: options.ok,
        color: options.danger === false ? 'primary' : 'negative',
        unelevated: true,
      },
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
  })
}

/** Abre um diálogo-componente e resolve com o valor do OK, ou `undefined` se cancelar. */
export function openDialog<T>(
  $q: QVueGlobals,
  component: unknown,
  componentProps: Record<string, unknown> = {},
): Promise<T | undefined> {
  return new Promise((resolve) => {
    $q.dialog({ component: component as never, componentProps })
      .onOk((value: T) => resolve(value))
      .onCancel(() => resolve(undefined))
  })
}
