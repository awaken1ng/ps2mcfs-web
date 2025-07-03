<template>
  <q-list
    class="entries full-width"
    bordered
    separator
  >
    <McfsEntryUp
      data-cy="entry-up"
      @click.prevent="closeEntryMenuIfInRoot"
      @touchend.prevent="closeEntryMenuIfInRoot"
    />

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
    </q-item>

    <q-item
      v-else-if="!entryList.entries.length"
      class="entry column items-center justify-center non-selectable"
    >
      <div class="text-subtitle2">No items</div>
    </q-item>

    <McfsEntryItem
      v-else
      v-for="entry in entries"
      :key="path.join(entry.name)"
      :ref="(ref) => setEntryRef(entry, ref)"
      :entry="entry"
      clickable
      menu
      @toggle-selection="toggleSelection(entry)"
      @open-directory="openDirectory(entry)"
      @open-menu="openEntryMenu(entry)"
    />
  </q-list>

  <McfsEntryMenu
    ref="menu"
    data-cy="entry-menu"
    :model-value="isMenuOpen"
    :entry="menuEntry"
    :target="menuTarget"
    @escape-key="closeEntryMenu"
    @save-file="saveFile"
    @export-psu="exportPsu"
    @copy-name="copyEntryName"
    @rename="openRenameEntryDialogue"
    @delete="deleteEntryFromMenu"
  />

  <DialogueEntryRename
    v-model="isRenameEntryDialogueOpen"
    :entry="renamedEntry"
    :entries-on-card="entries"
    @rename-entry="renameEntryFromMenu"
  />
</template>

<script setup lang="ts">
import { ComponentPublicInstance, nextTick, ref, useTemplateRef, watch } from 'vue'
import McfsEntryUp from 'components/McfsEntryUp.vue'
import McfsEntryItem from 'components/McfsEntryItem.vue'
import McfsEntryMenu from 'components/McfsEntryMenu.vue'
import DialogueEntryRename from 'components/DialogueEntryRename.vue'
import { isDirectoryEntry, useMcfs } from 'lib/ps2mc'
import { useSaveFileDialog } from 'lib/file'
import { dialogNoTransition, dialogSaveAs, joinPath, onClickOutside, pluralizeItems } from 'lib/utils'
import { usePathStore } from 'stores/path'
import { useEntryListStore } from 'stores/entryList'
import { storeToRefs } from 'pinia'
import { useClipboard } from '@vueuse/core'
import { McEntryInfo } from 'ps2mcfs-wasm/mcfs'

const mcfs = useMcfs()
const path = usePathStore()
const entryList = useEntryListStore()
const saveFileDialogue = useSaveFileDialog()

const { isLoading, isLoaded } = storeToRefs(mcfs.state)
const { entries } = storeToRefs(entryList)

const toggleSelection = (entry: McEntryInfo) => {
  if (isMenuOpen.value) {
    closeEntryMenu()
    return
  }

  entryList.toggleSelection(entry)
}

const openDirectory = (entry: McEntryInfo) => {
  if (isMenuOpen.value) {
    closeEntryMenu()
    return
  }

  if (!isDirectoryEntry(entry))
    return

  const dirPath = path.join(entry.name)
  path.goToDirectory(dirPath)
}

watch(() => path.current, () => {
  if (mcfs.state.isLoaded)
    entryList.refresh()
})

// region: menu

const entryToElement = ref(new Map<McEntryInfo, HTMLDivElement>())

const menu = useTemplateRef('menu')

const isMenuOpen  = ref(false)
const menuTarget = ref<HTMLDivElement>()
const menuEntry = ref<McEntryInfo>()

watch(() => entries.value.length, () => entryToElement.value.clear())

const setEntryRef = (entry: McEntryInfo, ref: Element | ComponentPublicInstance | null) => {
  if (!ref)
    return

  const el = (ref as ComponentPublicInstance).$el as HTMLDivElement
  entryToElement.value.set(entry, el)
}

const openEntryMenu = (entry: McEntryInfo) => {
  const target = entryToElement.value.get(entry)
  const targetChanged = menuTarget.value !== target

  // when trying to open menu on the same entry, with already opened menu, close it instead
  if (!targetChanged && isMenuOpen.value) {
    closeEntryMenu()
    return
  }

  // when opening menu on unselected entry, deselect everything
  if (!entryList.selected.has(entry)) {
    entryList.deselectAll()
  }

  menuTarget.value = target
  menuEntry.value = entry
  if (isMenuOpen.value) {
    // need to wait a tick for it to actually update
    nextTick(() => {
      updateMenuPosition()
    })
  } else {
    isMenuOpen.value = true
  }
}

const updateMenuPosition = () => {
  menu.value?.qmenu?.updatePosition()
}

const closeEntryMenuIfInRoot = () => {
  if (path.isRoot || isMenuOpen.value) {
    closeEntryMenu()
    return
  }

  path.goToRoot()
}

const closeEntryMenu = () => {
  isMenuOpen.value = false
  menuTarget.value = undefined
  menuEntry.value = undefined
}

// also covers going up
onClickOutside((event: Event) => {
  let el = event.target as (HTMLElement | null)

  while (true) {
    if (!el)
      break

    const inEntryList = el.classList.contains('q-list')
    const inMenu = el.classList.contains('q-menu')
    if (inMenu || inEntryList)
      return

    el = el.parentElement
  }

  if (isMenuOpen.value)
    closeEntryMenu()
})

// endregion: menu

// region: save

const saveFile = (entry: McEntryInfo) => {
  closeEntryMenu()

  const contents = mcfs.readFile(path.current, entry)
  if (!contents)
    return

  saveFileDialogue.saveAsBlob(entry.name, contents)
}

// endregion: save

// region: export .psu

const exportPsu = (entry: McEntryInfo) => {
  closeEntryMenu()

  if (!isDirectoryEntry(entry))
    return

  const dirPath = joinPath('/', entry.name)
  const psu = mcfs.exportDirectoryAsPsu({ path: dirPath })
  if (!psu)
    return

  dialogSaveAs({
    title: 'Export .psu',
    fileName: `${entry.name}.psu`,
    onOk: (fileName) => {
      saveFileDialogue.saveAsBlob(fileName, psu)
    },
  })
}

// endregion: export .psu


// region: copy name

const clipboard = useClipboard()

const copyEntryName = (entry: McEntryInfo) => {
  if (clipboard.isSupported) {
    clipboard.copy(entry.name)
  }

  closeEntryMenu()
}

// endregion: copy name

// region: rename

const isRenameEntryDialogueOpen  = ref(false)
const renamedEntry = ref<McEntryInfo>()

const openRenameEntryDialogue = (entry: McEntryInfo) => {
  closeEntryMenu()
  renamedEntry.value = entry
  isRenameEntryDialogueOpen.value = true
}

const renameEntryFromMenu = (newName: string) => {
  if (!renamedEntry.value)
    return

  mcfs.renameEntry(path.current, renamedEntry.value, newName)
  entryList.refresh()
}

// endregion: rename

// region: delete

const deleteEntryFromMenu = (entries: McEntryInfo[]) => {
  closeEntryMenu()

  if (!entries.length)
    return

  let message: string
  if (entries.length === 1) {
    message = `Delete ${entries[0]!.name}?`
  } else {
    message = `Delete ${pluralizeItems(entries.length)}?`
  }

  dialogNoTransition({
    title: 'Delete',
    message,
    cancel: true,
  }).onOk(() => {
    entries.forEach(entry => mcfs.deleteEntry(path.current, entry))
    entryList.refresh()
  })
}

// endregion: delete
</script>

<style lang="css" scoped>
.entries { max-width: 600px; }

/* make the items slightly taller on mobile */
.entries > .q-item { min-height: 56px; }
.entries > .q-item.double-height { min-height: 112px; }

@media (min-width: 500px) {
  /* reset items height on non-mobile */
  .entries > .q-item { min-height: 48px; }
  .entries > .q-item.double-height { min-height: 96px; }
}
</style>
