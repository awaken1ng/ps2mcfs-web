import { defineStore, acceptHMRUpdate } from 'pinia'
import { useMeta } from 'quasar'
import { ref } from 'vue'

export const DEFAULT_VMC_FILE_NAME = 'ps2-memory-card.bin'

export const useMcfsStore = defineStore('mcfs', () => {
  const cardSize = ref(0)
  const availableSpace = ref(0)
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const hasUnsavedChanges = ref(false)
  const fileName = ref(DEFAULT_VMC_FILE_NAME)

  useMeta(() => ({
    // titleTemplate doesn't work with reactive meta, *sigh*
    title: isLoaded.value ? `PS2 VMC - ${fileName.value}` : `PS2 VMC`
  }))

  return {
    isLoading,
    isLoaded,
    availableSpace,
    cardSize,
    hasUnsavedChanges,
    fileName,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMcfsStore, import.meta.hot))
}
