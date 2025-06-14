import { Notify, type QNotifyCreateOptions } from 'quasar'
import { onMounted, onUnmounted } from 'vue';

type ErrorMessage = {  message: string, caption?: string }

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

export const joinPath = (a: string, b: string) => {
  if (a[a.length - 1] !== '/')
    a += '/'
  a += b
  return a
}

export const onBeforeUnload = (handler: (event: BeforeUnloadEvent) => void) => {
  onMounted(() => {
    window.addEventListener('beforeunload', handler)
  })

  onUnmounted(() => {
    window.removeEventListener("beforeunload", handler)
  })
}
