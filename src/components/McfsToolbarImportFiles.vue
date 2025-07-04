<template>
  <q-btn
    flat no-caps no-wrap :icon="ICON_VMC_IMPORT_FILE" label="Add files" data-cy="toolbar-addFile"
    @click="openAddFileDialogue" :disabled="!isLoaded"
  />

  <DialogueImportFiles
    v-model="isAddFileDialogueOpen"
    :files-to-add="filesToAdd"
    :is-writing="isWriting"
    :availableSpace="availableSpace"
    @remove-item="removeItemFromAddList"
    @remove-all="clearFilesToAdd"
    @add-file="addFileToAddList"
    @add-to-card="addFilesToCard"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DialogueImportFiles, { type FileToAdd } from 'components/DialogueImportFiles.vue'
import { notifyWarning } from 'lib/utils'
import { useDropZone, useFileDialog } from '@vueuse/core'
import { ICON_VMC_IMPORT_FILE } from 'lib/icon'
import { useMcfs } from 'lib/ps2mc'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { storeToRefs } from 'pinia'

const mcfs = useMcfs()
const path = usePathStore()
const entryList = useEntryListStore()

const { isLoaded, availableSpace } = storeToRefs(mcfs.state)

const pickFileDialog = useFileDialog({ multiple: true, reset: true })

const isAddFileDialogueOpen = ref(false)
const isWriting = ref(false)
const filesToAdd = ref<FileToAdd[]>([])

const openAddFileDialogue = () => {
  isAddFileDialogueOpen.value = true
  addFileToAddList()
}

const addFileToAddList = () => {
  pickFileDialog.open()
}

pickFileDialog.onChange((fileList) => {
  if (!fileList)
    return

  const files: File[] = []
  for (const file of fileList) {
    files.push(file)
  }

  const filesSize = files.reduce((total, item) => total + item.size, 0)
  if (filesSize > availableSpace.value) {
    notifyWarning({ message: `Not enough free space on the card` })
    return
  }

  files.forEach(file => {
    filesToAdd.value.push({ name: file.name, file })
  })
})

const removeItemFromAddList = (idx: number) => {
  filesToAdd.value.splice(idx, 1)
}

const clearFilesToAdd = () => {
  filesToAdd.value = []
}

const addFilesToCard = async () => {
  isWriting.value = true

  for (let idx = 0; idx < filesToAdd.value.length; idx++) {
    const file = filesToAdd.value[idx]!;

    const filePath = path.join(file.name)
    const contents = await file.file.bytes()
    mcfs.writeFile({ path: filePath, data: contents })
  }

  entryList.refresh()

  isWriting.value = false
  isAddFileDialogueOpen.value = false
  clearFilesToAdd()
}

const onDrop = async (items: File[] | null) => {
  if (!isLoaded.value || !items)
    return

  const files: File[] = []
  for (const item of items) {
    if (!item.size) {
      try {
        await item.bytes()
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // presumably directory, skip
          continue
        }

        throw err
      }
    }

    files.push(item)
  }

  const mapped: FileToAdd[] = files.map(file => ({ name: file.name, file } ))

  if (isAddFileDialogueOpen.value) {
    filesToAdd.value = filesToAdd.value.concat(mapped)
  } else {
    filesToAdd.value = mapped || []
    isAddFileDialogueOpen.value = true
  }
}

useDropZone(document, { onDrop, multiple: true, preventDefaultForUnhandled: true })
</script>
