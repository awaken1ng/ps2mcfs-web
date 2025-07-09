import { Notify, Dialog, QDialogOptions, type QNotifyCreateOptions } from 'quasar'
import { useMcfsStore } from 'src/stores/mcfs'
import { onMounted, onUnmounted } from 'vue'

type ErrorMessage = { message: string, caption?: string }

const MEBIBYTE = 1048576;
const KIBIBYTE = 1024;

export const notifyError = (args: ErrorMessage) => {
  console.error(args)
  const { message, caption } = args

  const props: QNotifyCreateOptions =  {
    position: 'bottom',
    type: 'negative',
    message,
    timeout: 0,
    closeBtn: true,
  }
  if (caption) props.caption = caption

  return Notify.create(props)
}

export const notifyWarning = (args: ErrorMessage) => {
  console.error(args)
  const { message, caption } = args

  const props: QNotifyCreateOptions =  {
    position: 'bottom',
    type: 'warning',
    message,
    closeBtn: true,
  }
  if (caption) props.caption = caption

  return Notify.create(props)
}

export const formatBytes = (bytes: number) => {
  if (bytes >= MEBIBYTE) {
    return (bytes / MEBIBYTE).toFixed(2) + ' MiB'
  } else {
    return (bytes / KIBIBYTE).toFixed(2) + ' KiB'
  }
}

export const itemsForm = (n: number) => {
  const cardinalRules = new Intl.PluralRules("en-US")
  const category = cardinalRules.select(n)
  const form = category === 'one' ? 'item' : 'items'
  return form
}

export const pluralizeItems = (n: number) => `${n} ${itemsForm(n)}`

export const onBeforeUnload = (handler: (event: BeforeUnloadEvent) => void) => {
  onMounted(() => {
    document.addEventListener('beforeunload', handler)
  })

  onUnmounted(() => {
    document.removeEventListener("beforeunload", handler)
  })
}

export const onClickOutside = (handler: (event: Event) => void) => {
  onMounted(() => {
    document.addEventListener('click', handler, true)
    document.addEventListener('touchend', handler, true)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handler, true)
    document.removeEventListener('touchend', handler, true)
  })
}

export const dialogNoTransition = (opts: QDialogOptions) => {
  return Dialog.create({
    // remove transition animation to focus immediately,
    // instead of waiting for animation to end first
    // @ts-expect-error not defined in the interface, but its a valid prop
    transitionDuration: 0,
    ...opts
  })
}

export const dialogSaveAs = (opts: { title: string, fileName: string, onOk: (fileName: string) => void }) => {
  dialogNoTransition({
    title: opts.title,
    message: 'File name:',
    prompt: {
      model: opts.fileName,
    },
    cancel: true,
  }).onOk(opts.onOk)
}

export const canDiscardUnsavedChanges = (message: string) => new Promise((resolve) => {
  const state = useMcfsStore()

  if (!state.hasUnsavedChanges) {
    resolve(true)
    return
  }

  dialogNoTransition({
    title: 'Unsaved changes',
    message,
    cancel: true,
  })
  .onOk(() => resolve(true))
  .onCancel(() => resolve(false))
  .onDismiss(() => resolve(false))
})
