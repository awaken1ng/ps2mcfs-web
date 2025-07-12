
import { inject, provide, Ref, TemplateRef } from "vue"
import type { ComponentExposed } from 'vue-component-type-helpers'
import DialogueEntryRename from 'components/DialogueEntryRename.vue'

const injectComponent = <T>(key: symbol) => {
  const component = inject<Ref<ComponentExposed<T>>>(key)
  if (!component)
    throw new Error('Component was not provided')

  return component
}

const renameDialogInjectionKey = Symbol('DialogueEntryRename injection key')
export const provideRenameEntryDialog = (component: TemplateRef<InstanceType<typeof DialogueEntryRename>>) => provide(renameDialogInjectionKey, component)
export const injectRenameEntryDialog = () => injectComponent<typeof DialogueEntryRename>(renameDialogInjectionKey)
