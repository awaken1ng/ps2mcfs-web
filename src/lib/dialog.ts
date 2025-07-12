
import { inject, provide, Ref, TemplateRef } from "vue"
import type { ComponentExposed } from 'vue-component-type-helpers'
import DialogueEntryRename from 'components/DialogueEntryRename.vue'
import { Dialog, QDialogOptions } from 'quasar'
import { useMcfsStore } from 'stores/mcfs'

const injectComponent = <T>(key: symbol) => {
  const component = inject<Ref<ComponentExposed<T>>>(key)
  if (!component)
    throw new Error('Component was not provided')

  return component
}

const renameDialogInjectionKey = Symbol('DialogueEntryRename injection key')
export const provideRenameEntryDialog = (component: TemplateRef<InstanceType<typeof DialogueEntryRename>>) => provide(renameDialogInjectionKey, component)
export const injectRenameEntryDialog = () => injectComponent<typeof DialogueEntryRename>(renameDialogInjectionKey)

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
