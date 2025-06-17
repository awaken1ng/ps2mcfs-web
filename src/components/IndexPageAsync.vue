<template>
  <q-page-container>
    <q-page class="column items-center">
      <q-toolbar class="wrap toolbar-primary">
        <q-btn
          flat no-caps sicon="sym_s_select_all" label="New"
          @click="newMemoryCard"
        />
        <q-btn
          flat no-caps sicon="sym_s_select_all" label="Open"
          @click="openFile"
        />
        <q-btn
          flat no-caps sicon="sym_s_select_all" label="Save as"
          @click="saveMemoryCardAs" :disable="!isLoaded"
        />
        <q-btn
          flat no-caps sicon="sym_s_select_all" label="Close"
          @click="closeMemoryCard" :disable="!isLoaded"
        />
      </q-toolbar>

      <q-toolbar class="toolbar-secondary">
        <div v-if="isLoaded" class="file-name">
          {{ fileName }} <span v-if="hasUnsavedChanges" class="non-selectable">*</span>
        </div>
        <q-skeleton v-else animation="none" width="10rem" />

        <div class="row no-wrap justify-center">
          <q-btn
            flat no-caps no-wrap icon="sym_s_note_add" title="Add file"
            @click="openAddFileDialogue" :disabled="!isLoaded"
          />
          <q-btn
            flat no-caps no-wrap icon="sym_s_create_new_folder" title="Create new directory"
            @click="openMakeDirectoryDialogue" :disabled="!isLoaded"
          />
          <q-btn
            flat no-caps no-wrap icon="sym_s_delete" title="Delete"
            @click="deleteSelectedEntries" :disabled="!Boolean(selected.size)"
          />
          <q-btn
            flat no-caps no-wrap
            :icon="selectOrDeselectIcon" :title="selectOrDeselectTitle"
            @click="selectOrDeselectAllEntries" :disabled="!isLoaded || !entries.length"
          />
        </div>
      </q-toolbar>

      <q-tabs
        v-model="currentPath"
        :indicator-color="isLoaded ? undefined : 'transparent'"
        no-caps
        outside-arrows
        class="full-width"
        align="left"
        :breakpoint="0"
      >
        <div v-if="!isLoaded" class="breadcrumbs-skeleton">
          <q-skeleton animation="none" width="2rem" />
        </div>

        <q-tab v-else name="/" @click="goToRootDirectory" :disable="isCurrentPathRoot">
          <div class="q-tab__label row q-gutter-md">
            <span>/</span>
            <div v-if="!isCurrentPathRoot">
              <q-icon name="sym_s_keyboard_arrow_right" />
            </div>
          </div>
        </q-tab>

        <template v-if="currentPath !== '/'">
          <q-tab
            v-for="fullComponent, idx in pathFullComponents"
            :key="fullComponent"
            :name="fullComponent"
            @click="goUpLevel(idx)"
            :disable="fullComponent === currentPath"
            :ripple="fullComponent === currentPath"
          >
            <div class="q-tab__label row q-gutter-md">
              <span>{{ pathComponents[idx] }}</span>

              <div v-if="fullComponent !== currentPath">
                <q-icon name="sym_s_keyboard_arrow_right" />
              </div>
            </div>
          </q-tab>
        </template>
      </q-tabs>

      <q-list
        class="entries full-width"
        bordered
        separator
      >
        <q-item
          v-if="isLoaded && !isLoading"
          class="entry non-selectable"
          :clickable="!isCurrentPathRoot"
          @click="goUpCurrentDirectory"
          :v-ripple="!isCurrentPathRoot"
        >
          <template v-if="!isCurrentPathRoot">
            <q-item-section avatar class="icon">
              <q-icon name="sym_s_subdirectory_arrow_left" />
            </q-item-section>

            <q-item-section>
              <span>..</span>
            </q-item-section>

            <q-item-section side class="side column">
              <div>
                <span :title="`${availableSpace} bytes`">{{ formatBytes(availableSpace) }}</span>
                free of
                <span :title="`${cardSize} bytes`">{{ formatBytes(cardSize) }}</span>
              </div>
            </q-item-section>
          </template>

          <template v-else>
            <q-item-section class="column items-center text-grey-7">
              <div>
                <span :title="`${availableSpace} bytes`">{{ formatBytes(availableSpace) }}</span>
                free of
                <span :title="`${cardSize} bytes`">{{ formatBytes(cardSize) }}</span>
              </div>
            </q-item-section>
          </template>
        </q-item>

        <q-item
          v-if="isLoading"
          class="entry double-height column items-center justify-center non-selectable"
        >
          <q-spinner-orbit />
          <div class="text-subtitle2">Loading</div>
        </q-item>

        <q-item
          v-else-if="!isLoaded"
          class="entry double-height column items-center justify-center non-selectable"
        >
          <div class="text-subtitle2">No card loaded</div>
          <q-btn-group outline>
            <q-btn outline label="New" @click="newMemoryCard"/>
            <q-btn outline label="Open" @click="openFile" />
          </q-btn-group>
        </q-item>

        <q-item
          v-else-if="!entries.length"
          class="entry column items-center justify-center non-selectable"
        >
          <div class="text-subtitle2">No items</div>
        </q-item>

        <q-item
          v-else
          class="entry non-selectable"
          v-for="entry in entries"
          :key="joinPath(currentPath, entry.name)"
          clickable
          v-touch-hold:300.mouse="() => toggleEntrySelection(entry)"
          :focused="selected.has(entry)"
          :active="selected.has(entry)"
          v-ripple
        >
          <q-item-section
            class="icon"
            avatar
            @click="(ev: Event) => { toggleEntrySelection(entry); ev.stopPropagation() }"
          >
            <q-icon :name="getEntryIcon(entry)" />
          </q-item-section>

          <q-item-section class="middle" @click="openDirectory(entry)">
            <q-item-label>
              {{ entry.name }}
            </q-item-label>

            <q-item-label caption class="size-and-attributes">
              <span>{{ formatEntrySize(entry) }}</span>
              <EntryAttributes class="attributes" :entry="entry"/>
            </q-item-label>

            <q-item-label caption class="date">
              <span :title="formatDateLong(entry.stat.mtime)">
                Modified: {{ formatDateShort(entry.stat.mtime) }}
              </span>
            </q-item-label>

          </q-item-section>

          <q-item-section side class="side attributes-and-date" @click="openDirectory(entry)">
            <q-item-label caption class="column items-end">
              <EntryAttributes :entry="entry"/>
              <span :title="formatDateLong(entry.stat.mtime)">Modified: {{ formatDateShort(entry.stat.mtime) }}</span>
            </q-item-label>
          </q-item-section>

          <q-item-section side class="side options">
            <q-btn size="12px" flat dense round icon="sym_s_more_vert" />
          </q-item-section>

          <q-menu anchor="bottom end" self="top end" class="non-selectable">
            <q-item clickable v-if="isFileEntry(entry)" @click="saveFile(entry)">
              <q-item-section>
                Save file
              </q-item-section>
            </q-item>

            <q-item clickable @click="openRenameEntryDialogue(entry)">
              <q-item-section>Rename</q-item-section>
            </q-item>

            <q-item clickable @click="deleteEntryFromMenu(entry)">
              <q-item-section>Delete</q-item-section>
            </q-item>
          </q-menu>
        </q-item>
      </q-list>

      <input ref="filePickerSingle" type="file" hidden>
      <input ref="filePickerMultiple" type="file" multiple hidden>
      <a ref="fileSaver" download hidden></a>
    </q-page>

    <AddFilesDialogue
      v-model="isAddFileDialogueOpen"
      :entries-on-card="entries"
      :files-to-add="filesToAdd"
      :is-writing="isWriting"
      :availableSpace="availableSpace"
      @remove-item="removeItemFromAddList"
      @remove-all="clearFilesToAdd"
      @add-file="addFileToAddList"
      @add-to-card="addFilesToCard"
    />
    <MakeDirectoryDialogue
      v-model="isMakeDirectoryDialogueOpen"
      :entries-on-card="entries"
      @make-directory="createNewDirectory"
    />
    <RenameEntryDialogue
      v-model="isRenameEntryDialogueOpen"
      :entry="renamedEntry"
      :entries-on-card="entries"
      @rename-entry="renameEntryFromMenu"
    />
  </q-page-container>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import createModule from 'lib/mcfs'
import {
  Entry, readDirectoryFilteredSorted, formatDateShort,
  formatEntrySize, isDirectoryEntry,
  openMemoryCardFromMemory,
  isEccImage,
  isNonEccImage,
  newMemoryCardInMemory,
  deleteEntry,
  formatDateLong,
  renameEntry,
  createDirectory,
  isFileEntry,
  getAvailableSpace,
  readFileFromEntry,
  writeFile,
} from 'lib/ps2mc'
import { getFileLegacy, getFilesLegacy, saveAsLegacy } from 'lib/file'
import { QDialogOptions, useQuasar } from 'quasar'
import { formatBytes, joinPath, notifyWarning, onBeforeUnload } from 'lib/utils'
import EntryAttributes from 'components/EntryAttributes.vue'
import AddFilesDialogue, { type FileToAdd } from 'components/AddFilesDialogue.vue'
import MakeDirectoryDialogue from 'components/MakeDirectoryDialogue.vue'
import RenameEntryDialogue from 'components/RenameEntryDialogue.vue'
import { useDropZone } from '@vueuse/core'

const DEFAULT_FILENAME = 'ps2-memory-card.bin'

const $q = useQuasar()
const mcfs = await createModule()

const filePickerSingle = useTemplateRef('filePickerSingle')
const filePickerMultiple = useTemplateRef('filePickerMultiple')
const fileSaver = useTemplateRef('fileSaver')

const isLoading = ref(false)
const isLoaded = ref(false)
const hasUnsavedChanges = ref(false)
const fileName = ref(DEFAULT_FILENAME)

const currentPath = ref('/')

const isCurrentPathRoot = computed(() => currentPath.value === '/')

const pathComponents = computed(() => {
  if (isCurrentPathRoot.value) return []
  return currentPath.value.substring(1).split('/')
})

const pathFullComponents = computed(() =>
  pathComponents.value.map((_component, idx) =>
    '/' + pathComponents.value
      .slice(0, idx + 1)
      .reduce((prev, cur) => `${prev}/${cur}`)
  )
)

const cardSize = ref(0)
const availableSpace = ref(0)

const entries = ref<Entry[]>([])

const dialogNoTransition = (opts: QDialogOptions) => {
  return $q.dialog({
    // remove transition animation to focus immediately,
    // instead of waiting for animation to end first
    // @ts-expect-error not defined in the interface, but its a valid prop
    transitionDuration: 0,
    ...opts
  })
}

const canDiscardUnsavedChanges = (message: string) => new Promise((resolve) => {
  if (!hasUnsavedChanges.value) {
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

const getEntryIcon = (entry: Entry) => {
  if (isDirectoryEntry(entry)) {
    return selected.value.has(entry) ? 'sym_s_folder_check' : 'sym_s_folder'
  } else {
    return selected.value.has(entry) ? 'sym_s_task' : 'sym_s_draft'
  }
}

// region: file operations

const newMemoryCard = async () => {
  if (!await canDiscardUnsavedChanges('Create new memory card?'))
    return

  const cardSpecs = newMemoryCardInMemory(mcfs)
  if (!cardSpecs)
    return

  cardSize.value = cardSpecs.cardSize
  availableSpace.value = cardSpecs.availableSpace
  isLoaded.value = true
  goToRootDirectory()
}

const openFile = async () => {
  if (!await canDiscardUnsavedChanges('Open new file?'))
    return

  if (!filePickerSingle.value)
    return

  const file = await getFileLegacy(filePickerSingle.value)
  if (!file)
    return

  fileName.value = file.name

  const isValidSize = isNonEccImage(file.size) || isEccImage(file.size)
  if (!isValidSize) {
    notifyWarning({ message: 'Invalid size, not a memory card image, or corrupted' })
    return
  }

  try {
    isLoading.value = true

    const buffer = await file.arrayBuffer()
    const array = new Uint8Array(buffer)

    const cardSpecs = openMemoryCardFromMemory(mcfs, array)
    if (!cardSpecs) return

    cardSize.value = cardSpecs.cardSize
    availableSpace.value = cardSpecs.availableSpace
    isLoaded.value = true
  } finally {
    isLoading.value = false
  }

  hasUnsavedChanges.value = false
  goToRootDirectory()
}

const saveMemoryCardAs = () => {
  if (!fileSaver.value || !isLoaded.value)
    return

  dialogNoTransition({
    title: 'Save as',
    message: 'File name:',
    prompt: {
      model: fileName.value,
    },
    cancel: true,
  }).onOk(() => {
    if (!fileSaver.value)
      return

    const buffer = mcfs.getCardBuffer()
    saveAsLegacy(fileSaver.value, fileName.value, buffer)
    hasUnsavedChanges.value = false
  })
}

const closeMemoryCard = async () => {
  if (!await canDiscardUnsavedChanges('Close the card?'))
    return

  fileName.value = DEFAULT_FILENAME
  currentPath.value = '/'
  cardSize.value = 0
  availableSpace.value = 0
  entries.value = []
  isLoaded.value = false
  hasUnsavedChanges.value = false
}

// region: mkdir

const isMakeDirectoryDialogueOpen = ref(false)

const openMakeDirectoryDialogue = () => {
  isMakeDirectoryDialogueOpen.value = true
}

const createNewDirectory = (dirName: string) => {
  const dirPath = joinPath(currentPath.value, dirName)
  createDirectory(mcfs, dirPath)
  refreshDirectory()
  hasUnsavedChanges.value = true
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
    message = `Delete ${selected.value.size} items?`
  }

  dialogNoTransition({
    title: 'Delete',
    message,
    cancel: true,
  }).onOk(() => {
    selected.value.forEach(entry => deleteEntry(mcfs, currentPath.value, entry))
    refreshDirectory()
    hasUnsavedChanges.value = true
  })
}

const deleteEntryFromMenu = (entry: Entry) => {
  dialogNoTransition({
    title: 'Delete',
    message: `Delete ${entry.name}?`,
    cancel: true,
  }).onOk(() => {
    deleteEntry(mcfs, currentPath.value, entry)
    refreshDirectory()
    selected.value.delete(entry)
    hasUnsavedChanges.value = true
  })
}

// region: rename

const isRenameEntryDialogueOpen  = ref(false)
const renamedEntry = ref<Entry>()

const openRenameEntryDialogue = (entry: Entry) => {
  renamedEntry.value = entry
  isRenameEntryDialogueOpen.value = true
}

const renameEntryFromMenu = (newName: string) => {
  if (!renamedEntry.value)
    return

  renameEntry(mcfs, currentPath.value, renamedEntry.value, newName)
  refreshDirectory()
  hasUnsavedChanges.value = true
}

// endregion: rename

const saveFile = (entry: Entry) => {
  if (!fileSaver.value)
    return

  const contents = readFileFromEntry(mcfs, currentPath.value, entry)
  if (!contents)
    return

  saveAsLegacy(fileSaver.value, entry.name, contents)
}

// endregion: file operations

// region: add file

const isAddFileDialogueOpen = ref(false)
const isWriting = ref(false)
const filesToAdd = ref<FileToAdd[]>([])

const openAddFileDialogue = async () => {
  isAddFileDialogueOpen.value = true
  await addFileToAddList()
}

const addFileToAddList = async () => {
  if (!filePickerMultiple.value)
    return

  const files = await getFilesLegacy(filePickerMultiple.value)

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

    const filePath = joinPath(currentPath.value, file.name)
    const contents = await file.file.bytes()
    writeFile(mcfs, filePath, contents)
  }

  refreshDirectory()

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

// endregion: add file/directory

// region: selection

const selected = ref<Set<Entry>>(new Set())

const toggleEntrySelection = (entry: Entry) => {
  if (selected.value.has(entry)) {
    selected.value.delete(entry)
  } else {
    selected.value.add(entry)
  }
}

const selectAllEntries = () =>
  entries.value.forEach(entry => selected.value.add(entry))

const deselectAllEntries = () => selected.value.clear()

const isSelectAll = computed(() => !selected.value.size)

const selectOrDeselectAllEntries = () => {
  if (isSelectAll.value)
    selectAllEntries()
  else
    deselectAllEntries()
}

const selectOrDeselectIcon = computed(() => isSelectAll.value ? 'sym_s_select_all' : 'sym_s_deselect')

const selectOrDeselectTitle = computed(() => isSelectAll.value ? 'Select all' : 'Deselect all')

// endregion: selection

// region: navigation

const refreshDirectory = () => {
  entries.value = readDirectoryFilteredSorted(mcfs, currentPath.value)
  availableSpace.value = getAvailableSpace(mcfs) || 0
  deselectAllEntries()
}

const goToDirectory = (path: string) => {
  currentPath.value = path
  refreshDirectory()
}

const goToRootDirectory = () => goToDirectory('/')

const goUpCurrentDirectory = () => {
  if (isCurrentPathRoot.value)
    return

  goToDirectory('/' + pathComponents.value.slice(0, -1).join('/'))
}

const goUpLevel = (level: number) => {
  console.log(level, pathComponents.value.length)

  const components = []

  for (; level >= 0; level--) {
    const component = pathComponents.value[level];
    components.push(component)
  }
  components.reverse()

  const fullPath = '/' + components.join('/')
  goToDirectory(fullPath)
}

const openDirectory = (entry: Entry) => {
  if (!isDirectoryEntry(entry))
    return

  goToDirectory(joinPath(currentPath.value, entry.name))
}

// endregion: navigation

onBeforeUnload((event) => {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
    event.returnValue = true
  }
})
</script>

<style lang="css" scoped>
.q-page {
  margin: 1rem auto;
  max-width: 600px;
}

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

.breadcrumbs-skeleton {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 12px;
  height: 48px;
}

/* override line height in the tab labels so that the arrow icon is not as misaligned */
.q-tab__label { line-height: 1; }

.entries { max-width: 600px; }

/* make the items slightly taller on mobile */
.entries > .q-item { min-height: 56px; }
.entries > .q-item.double-height { min-height: 112px; }

/*
  zero the outer padding, and instead pad inside,
  that way we can have a click event on the icon section
  not fall through the padding gap and trigger click on an entry
*/
.entry { padding: 0; }
.entry .icon { padding-left: 16px; }
.entry .middle, .entry .side { padding-right: 16px; }

/* remove the extra gap between labels */
.q-item__label + .q-item__label { margin-top: 0; }

/* allow word breaking the name */
.entry .middle { word-break: break-all; }

/* hide the side part on mobile */
.entry .side.attributes-and-date { display: none; }

/* fix the padding */
.entry .side.attributes-and-date { padding-right: 0; }
.entry .side.options { padding: 8px; }

/* un-gray the button */
.entry .side.options { color: unset; }

/* space size and attributes */
.entry .middle .size-and-attributes {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}

@media (min-width: 500px) {
  .toolbar-secondary { flex-direction: row; }

  /* reset items height on non-mobile */
  .entries > .q-item { min-height: 48px; }
  .entries > .q-item.double-height { min-height: 96px; }

  .entry .side.attributes-and-date,
  .entry .side.options {
    display: flex;
  }

  .entry .middle .attributes, .entry .middle .date {
    display: none;
  }
}

</style>
