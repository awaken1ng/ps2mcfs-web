import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref } from 'vue'

export const useMcfsStore = defineStore('mcfs', () => {
  const cardSize = ref(0)
  const availableSpace = ref(0)
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const hasUnsavedChanges = ref(false)

  return { isLoading, isLoaded, availableSpace, cardSize, hasUnsavedChanges }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMcfsStore, import.meta.hot))
}
