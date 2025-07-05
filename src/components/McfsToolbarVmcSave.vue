<template>
  <q-btn
    flat no-caps no-wrap :icon="ICON_VMC_SAVE" label="Save as" data-cy="toolbar-vmc-saveAs"
    @click="openSaveCardDialogue" :disable="!isLoaded"
  />

  <DialogueVmcSave
    v-model="isSaveCardDialogueOpen"
    :initial-name="fileName"
    :is-writing
    :bytes-exported
    :bytes-to-export
    @save-card="saveMemoryCard"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DialogueVmcSave from 'components/DialogueVmcSave.vue'
import { useMcfs } from 'lib/ps2mc'
import { useSaveFileDialog } from 'lib/file'
import { storeToRefs } from 'pinia'
import { ICON_VMC_SAVE } from 'lib/icon'

const mcfs = useMcfs()

const { isLoaded, fileName } = storeToRefs(mcfs.state)

const isSaveCardDialogueOpen = ref(false)

const openSaveCardDialogue = () => {
  isSaveCardDialogueOpen.value = true
}

const saveFileDiloague = useSaveFileDialog()

const isWriting = ref(false)
const bytesExported = ref(0)
const bytesToExport = ref(0)

const saveMemoryCard = (name: string, withEcc: boolean) => {
  try {
    isWriting.value = true

    const buffer = mcfs.saveCardToMemory({
      withEcc,
      onProgress: (bytesWritten, bytesToWrite) => {
        bytesExported.value = bytesWritten
        bytesToExport.value = bytesToWrite
      }
    })

    if (!buffer)
      return

    saveFileDiloague.saveAsBlob(name, buffer)
    fileName.value = name
    isSaveCardDialogueOpen.value = false
  } finally {
    isWriting.value = false
    bytesExported.value = 0
    bytesToExport.value = 0
  }
}
</script>
