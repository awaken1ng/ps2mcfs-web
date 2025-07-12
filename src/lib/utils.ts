import { Notify, type QNotifyCreateOptions } from 'quasar'
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
