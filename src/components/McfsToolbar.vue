<template>
  <q-toolbar class="wrap toolbar-primary">
    <q-btn
      flat no-caps sicon="sym_s_select_all" label="New" data-cy="toolbar-new"
      @click="newMemoryCard"
    />
    <q-btn
      flat no-caps sicon="sym_s_select_all" label="Open" data-cy="toolbar-open"
      @click="openMemoryCardFromFile"
    />
    <q-btn
      flat no-caps sicon="sym_s_select_all" label="Save as" data-cy="toolbar-saveAs"
      @click="saveMemoryCardAs" :disable="!isLoaded"
    />
    <q-btn
      flat no-caps sicon="sym_s_select_all" label="Close" data-cy="toolbar-close"
      @click="closeMemoryCard" :disable="!isLoaded"
    />
  </q-toolbar>

  <q-toolbar class="toolbar-secondary">
    <div v-if="isLoaded" class="file-name" data-cy="file-name">
      {{ fileName }} <span v-if="hasUnsavedChanges" class="non-selectable">*</span>
    </div>
    <q-skeleton v-else animation="none" width="10rem" data-cy="file-name-skeleton" />

    <div class="row no-wrap justify-center">
      <q-btn
        flat no-caps no-wrap icon="sym_s_note_add" title="Add file" data-cy="toolbar-addFile"
        @click="openAddFileDialogue" :disabled="!isLoaded"
      />
      <q-btn
        flat no-caps no-wrap icon="sym_s_create_new_folder" title="Create new directory" data-cy="toolbar-createDirectory"
        @click="openMakeDirectoryDialogue" :disabled="!isLoaded"
      />
      <q-btn
        flat no-caps no-wrap icon="sym_s_delete" title="Delete" data-cy="toolbar-delete"
        @click="deleteSelectedEntries" :disabled="entryList.isSelectedNone"
      />
      <q-btn
        flat no-caps no-wrap
        :icon="selectOrDeselectIcon" :title="selectOrDeselectTitle" data-cy="toolbar-toggleSelect"
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

  <DialogueDirectoryCreate
    v-model="isMakeDirectoryDialogueOpen"
    @make-directory="createNewDirectory"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import DialogueFilesAdd, { type FileToAdd } from 'components/DialogueFilesAdd.vue'
import DialogueDirectoryCreate from 'components/DialogueDirectoryCreate.vue'
import { isEccImage, isNonEccImage, useMcfs } from 'lib/ps2mc'
import { dialogNoTransition, canDiscardUnsavedChanges, notifyWarning, pluralizeItems } from 'lib/utils'
import { useOpenFileDialog, useSaveFileDialog } from 'lib/file'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { storeToRefs } from 'pinia'
import { useDropZone } from '@vueuse/core'

const DEFAULT_FILENAME = 'ps2-memory-card.bin'

const mcfs = useMcfs()
const path = usePathStore()
const entryList = useEntryListStore()

const { isLoaded, availableSpace, hasUnsavedChanges } = storeToRefs(mcfs.state)
const { entries, selected } = storeToRefs(entryList)

const openFileDialogue = useOpenFileDialog()
const saveFileDiloague = useSaveFileDialog()

const newMemoryCard = async () => {
  if (!await canDiscardUnsavedChanges('Create new memory card?'))
    return

  const cardSpecs = mcfs.newCardInMemory()
  if (!cardSpecs)
    return

  path.goToRoot()
  entryList.refresh()
}

const openMemoryCardFromFile = async () => {
  if (!await canDiscardUnsavedChanges('Open new file?'))
    return

  const file = await openFileDialogue.open({ multiple: false })
  if (!file)
    return

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
}

const saveMemoryCardAs = () => {
  if (!isLoaded.value)
    return

  dialogNoTransition({
    title: 'Save as',
    message: 'File name:',
    prompt: {
      model: fileName.value,
    },
    cancel: true,
  }).onOk(() => {
    const buffer = mcfs.saveCardToMemory()
    saveFileDiloague.saveAsBlob(fileName.value, buffer)
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

const isAddFileDialogueOpen = ref(false)
const isWriting = ref(false)
const filesToAdd = ref<FileToAdd[]>([])

const openAddFileDialogue = async () => {
  isAddFileDialogueOpen.value = true
  await addFileToAddList()
}

const addFileToAddList = async () => {
  const files = await openFileDialogue.open({ multiple: true })

  const filesSize = files.reduce((total, item) => total + item.size, 0)
  if (filesSize > availableSpace.value) {
    notifyWarning({ message: `Not enough free space on the card` })
    return
  }

  files.forEach(file => {
    filesToAdd.value.push({ name: file.name, file })
  })
}

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
    mcfs.writeFile(filePath, contents)
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

// region: mkdir

const isMakeDirectoryDialogueOpen = ref(false)

const openMakeDirectoryDialogue = () => {
  isMakeDirectoryDialogueOpen.value = true
}

const createNewDirectory = (dirName: string) => {
  const dirPath = path.join(dirName)
  mcfs.createDirectory(dirPath)
  entryList.refresh()
}

// endregion: mkdir

const deleteSelectedEntries = () => {
  if (!selected.value.size)
    return

  let message: string
  if (selected.value.size === 1) {
    const selectedEntry = selected.value.entries().next().value![0]
    message = `Delete ${selectedEntry.name}?`
  } else {
    message = `Delete ${pluralizeItems(selected.value.size)}?`
  }

  dialogNoTransition({
    title: 'Delete',
    message,
    cancel: true,
  }).onOk(() => {
    selected.value.forEach(entry => mcfs.deleteEntry(path.current, entry))
    entryList.refresh()
  })
}

const selectOrDeselectIcon = computed(() => entryList.isSelectedAll ? 'sym_s_deselect' : 'sym_s_select_all')

const selectOrDeselectTitle = computed(() => entryList.isSelectedAll ? 'Deselect all' : 'Select all')
</script>

<style lang="css" scoped>
.toolbar-primary,
.toolbar-secondary {
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

.toolbar-primary .loading-spinner { margin: 12px 21px; }
.toolbar-secondary .toolbar-spacer { padding: 6px; }

@media (min-width: 500px) {
  .toolbar-secondary { flex-direction: row; }
}
</style>
