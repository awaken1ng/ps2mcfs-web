<template>
  <q-toolbar class="justify-center">
    <!-- toolbar uses no-wrap, use an inner container that can be wrapped instead -->
    <!-- and split buttons further, so that when wrap happens, it nicely splits in half -->
    <div class="row wrap justify-center">
      <div class="row wrap justify-center">
        <q-btn
          flat no-caps no-wrap icon="sym_s_note_add" label="New" data-cy="toolbar-new"
          @click="newMemoryCard"
        />
        <q-btn
          flat no-caps no-wrap icon="sym_s_file_open" label="Open" data-cy="toolbar-open"
          @click="openMemoryCardFromFile"
        />
      </div>

      <div class="row wrap justify-center">
        <q-btn
          flat no-caps no-wrap icon="sym_s_file_save" label="Save as" data-cy="toolbar-saveAs"
          @click="saveMemoryCardAs" :disable="!isLoaded"
        />
        <q-btn
          flat no-caps no-wrap icon="sym_s_close" label="Close" data-cy="toolbar-close"
          @click="closeMemoryCard" :disable="!isLoaded"
        />
      </div>
    </div>
  </q-toolbar>

  <q-toolbar class="justify-center">
    <div class="row wrap justify-center">
      <q-btn
        flat no-caps no-wrap icon="sym_s_note_stack_add" label="Add files" data-cy="toolbar-addFile"
        @click="openAddFileDialogue" :disabled="!isLoaded"
      />
      <q-btn
        flat no-caps no-wrap
        icon="sym_s_place_item"
        label="Import .psu"
        @click="openImportPsuDialog"
        :disable="!isLoaded"
        data-cy="toolbar-importPsu"
      />
      <q-btn
        flat no-caps no-wrap icon="sym_s_create_new_folder" label="Create new directory" data-cy="toolbar-createDirectory"
        @click="openMakeDirectoryDialogue" :disabled="!isLoaded || !path.isRoot"
      />
    </div>

  </q-toolbar>

  <q-toolbar class="toolbar-secondary">
    <div v-if="isLoaded" class="file-name" data-cy="file-name">
      {{ fileName }} <span v-if="hasUnsavedChanges" class="non-selectable">*</span>
    </div>
    <q-skeleton v-else animation="none" width="10rem" data-cy="file-name-skeleton" />

    <div class="row wrap justify-center">
      <q-btn
        flat no-caps no-wrap
        :icon="selectOrDeselectIcon" :label="selectOrDeselectTitle" data-cy="toolbar-toggleSelect"
        @click="entryList.toggleSelectionAll" :disabled="!isLoaded || !entries.length"
      />
    </div>
  </q-toolbar>

  <DialogueFilesAdd
    v-model="isAddFileDialogueOpen"
    :files-to-add="filesToAdd"
    :is-writing="isWriting"
    :availableSpace="availableSpace"
    @remove-item="removeItemFromAddList"
    @remove-all="clearFilesToAdd"
    @add-file="addFileToAddList"
    @add-to-card="addFilesToCard"
  />

  <DialoguePsuImport
    v-model="isImportPsuDialogueOpen"
    :file-name="psuName"
    :psu="psu"
    :availableSpace="availableSpace"
    :is-writing="isWriting"
    @import="importSelectedPsu"
  />

  <DialogueDirectoryCreate
    v-model="isMakeDirectoryDialogueOpen"
    @make-directory="createNewDirectory"
  />
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import DialogueFilesAdd, { type FileToAdd } from 'components/DialogueFilesAdd.vue'
import DialoguePsuImport from 'components/DialoguePsuImport.vue'
import DialogueDirectoryCreate from 'components/DialogueDirectoryCreate.vue'
import { isEccImage, isNonEccImage, useMcfs } from 'lib/ps2mc'
import {
  canDiscardUnsavedChanges, dialogSaveAs, notifyWarning,
} from 'lib/utils'
import { useSaveFileDialog } from 'lib/file'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { storeToRefs } from 'pinia'
import { useDropZone, useFileDialog } from '@vueuse/core'
import { Psu, readPsu } from 'src/lib/psu'

const DEFAULT_FILENAME = 'ps2-memory-card.bin'

const mcfs = useMcfs()
const path = usePathStore()
const entryList = useEntryListStore()

const { isLoaded, availableSpace, hasUnsavedChanges } = storeToRefs(mcfs.state)
const { entries } = storeToRefs(entryList)

const newMemoryCard = async () => {
  if (!await canDiscardUnsavedChanges('Create new memory card?'))
    return

  const cardSpecs = mcfs.newCardInMemory()
  if (!cardSpecs)
    return

  path.goToRoot()
  entryList.refresh()
}

const openMemoryCardDialog = useFileDialog({ multiple: false, reset: true })

const openMemoryCardFromFile = async () => {
  if (!await canDiscardUnsavedChanges('Open new file?'))
    return

  openMemoryCardDialog.open()
}

openMemoryCardDialog.onChange(async (files) => {
  if (!files || files.length !== 1)
    return

  const file = files.item(0)!
  fileName.value = file.name

  const isValidSize = isNonEccImage(file.size) || isEccImage(file.size)
  if (!isValidSize) {
    notifyWarning({ message: 'Invalid size, not a memory card image, or corrupted' })
    return
  }

  const buffer = await file.arrayBuffer()
  const array = new Uint8Array(buffer)

  if (!mcfs.openCardFromMemory(array))
    return

  path.goToRoot()
  entryList.refresh()
})

const saveFileDiloague = useSaveFileDialog()

const saveMemoryCardAs = () => {
  if (!isLoaded.value)
    return

  dialogSaveAs({
    title: 'Save memory card',
    fileName: fileName.value,
    onOk: (fileName) => {
      const buffer = mcfs.saveCardToMemory()
      saveFileDiloague.saveAsBlob(fileName, buffer)
    },
  })
}

const closeMemoryCard = async () => {
  if (!await canDiscardUnsavedChanges('Close the card?'))
    return

  fileName.value = DEFAULT_FILENAME
  path.goToRoot()
  mcfs.closeCard()
  entryList.set([])
}

const fileName = ref(DEFAULT_FILENAME)

// region: add file

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

// endregion: add file

// region: psu import

const openPsuFileDialog = useFileDialog({ multiple: false, reset: true })
const isImportPsuDialogueOpen = ref(false)
const psu = ref<Psu>()
const psuName = ref('')

const openImportPsuDialog = () => {
  openPsuFileDialog.open()
}

openPsuFileDialog.onChange(async (files) => {
  if (!files || files.length !== 1)
    return

  const file = files.item(0)!
  const contents = await file.bytes()

  psuName.value = file.name
  psu.value = readPsu(contents)
  if (!psu.value)
    return

  const filesSize = psu.value.entries.reduce((total, entry) => total + entry.stat.size, 0)
  if (filesSize > availableSpace.value) {
    notifyWarning({ message: `Not enough free space on the card` })
    return
  }

  isImportPsuDialogueOpen.value = true
})

watchEffect(() => {
  if (isImportPsuDialogueOpen.value)
    return

  // unset .psu when closing the import dialog
  psu.value = undefined
})

const importSelectedPsu = (overwrite: boolean) => {
  if (!psu.value)
    return

  try {
    isWriting.value = true
    mcfs.importDirectoryFromPsu({ psu: psu.value, overwrite })
    if (path.isRoot) entryList.refresh()
  } finally {
    isImportPsuDialogueOpen.value = false
    isWriting.value = false
  }
}

// endregion: psu import

// region: mkdir

const isMakeDirectoryDialogueOpen = ref(false)

const openMakeDirectoryDialogue = () => {
  isMakeDirectoryDialogueOpen.value = true
}

const createNewDirectory = (dirName: string) => {
  const dirPath = path.join(dirName)
  mcfs.createDirectory({ path: dirPath, existsOk: false })
  entryList.refresh()
}

// endregion: mkdir

const selectOrDeselectIcon = computed(() => entryList.isSelectedAll ? 'sym_s_deselect' : 'sym_s_select_all')

const selectOrDeselectTitle = computed(() => entryList.isSelectedAll ? 'Deselect all' : 'Select all')
</script>

<style lang="css" scoped>
.q-toolbar {
  padding: 6px 12px;
}

.toolbar-primary {
  flex-wrap: wrap;
}

.toolbar-secondary {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 6px 12px;
  gap: 6px;
}

.toolbar-secondary .file-name {
  word-break: break-all;
}

@media (min-width: 500px) {
  .toolbar-secondary { flex-direction: row; }
}
</style>
