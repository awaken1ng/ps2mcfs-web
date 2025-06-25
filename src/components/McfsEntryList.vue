<template>
  <q-list
    class="entries full-width"
    bordered
    separator
  >
    <McfsEntryUp
      class="entry" data-cy="entry-up"
      @click="closeEntryMenuIfInRoot"
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

    <q-item
      v-else
      class="entry non-selectable"
      v-for="entry in entries"
      :ref="(ref) => setEntryRef(entry, ref)"
      :key="path.join(entry.name)"
      clickable
      @contextmenu.prevent="openEntryMenu(entry)"
      :focused="entryList.isSelected(entry)"
      :active="entryList.isSelected(entry)"
      v-ripple
      data-cy="entry"
    >
      <q-item-section
        avatar data-cy="entry-icon"
        @click.stop="toggleSelection(entry)"
      >
        <McfsEntryIcon :entry="entry" />
      </q-item-section>

      <q-item-section class="middle" @click="openDirectory(entry)">
        <q-item-label data-cy="entry-name">
          {{ entry.name }}
        </q-item-label>

        <q-item-label caption class="size-and-attributes">
          <span>{{ formatEntrySize(entry) }}</span>
          <McfsEntryAttributes class="attributes" :entry="entry"/>
        </q-item-label>

        <q-item-label caption class="date">
          <span :title="formatDateLong(entry.stat.mtime)">
            Modified: {{ formatDateShort(entry.stat.mtime) }}
          </span>
        </q-item-label>

      </q-item-section>

      <q-item-section side class="side attributes-and-date" @click="openDirectory(entry)">
        <q-item-label caption class="column items-end">
          <McfsEntryAttributes :entry="entry"/>
          <span :title="formatDateLong(entry.stat.mtime)">Modified: {{ formatDateShort(entry.stat.mtime) }}</span>
        </q-item-label>
      </q-item-section>

      <q-item-section side class="side options" @click.stop="openEntryMenu(entry)" data-cy="entry-menu-open">
        <q-btn size="12px" flat dense round icon="sym_s_more_vert" />
      </q-item-section>
    </q-item>
  </q-list>

  <McfsEntryMenu
    ref="menu"
    data-cy="entry-menu"
    :model-value="isMenuOpen"
    :entry="menuEntry"
    :target="menuTarget"
    @escape-key="closeEntryMenu"
    @save-file="saveFile"
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
import McfsEntryIcon from 'components/McfsEntryIcon.vue'
import McfsEntryAttributes from 'components/McfsEntryAttributes.vue'
import McfsEntryMenu from 'components/McfsEntryMenu.vue'
import DialogueEntryRename from 'components/DialogueEntryRename.vue'
import { type Entry, isDirectoryEntry, isFileEntry, useMcfs } from 'lib/ps2mc'
import { McStDateTime } from 'lib/mcfs'
import { useSaveFileDialog } from 'lib/file'
import { dialogNoTransition, formatBytes, onClickOutside, pluralizeItems } from 'lib/utils'
import { usePathStore } from 'stores/path'
import { useEntryListStore } from 'stores/entryList'
import { storeToRefs } from 'pinia'
import { useClipboard } from '@vueuse/core'

const mcfs = useMcfs()
const path = usePathStore()
const entryList = useEntryListStore()
const saveFileDialogue = useSaveFileDialog()

const { isLoading, isLoaded } = storeToRefs(mcfs.state)
const { entries } = storeToRefs(entryList)

const toggleSelection = (entry: Entry) => {
  if (isMenuOpen.value) {
    closeEntryMenu()
    return
  }

  entryList.toggleSelection(entry)
}

const openDirectory = (entry: Entry) => {
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

const entryToElement = ref(new Map<Entry, HTMLDivElement>())

const menu = useTemplateRef('menu')

const isMenuOpen  = ref(false)
const menuTarget = ref<HTMLDivElement>()
const menuEntry = ref<Entry>()

watch(() => entries.value.length, () => entryToElement.value.clear())

const setEntryRef = (entry: Entry, ref: Element | ComponentPublicInstance | null) => {
  if (!ref)
    return

  const el = (ref as ComponentPublicInstance).$el as HTMLDivElement
  entryToElement.value.set(entry, el)
}

const openEntryMenu = (entry: Entry) => {
  const target = entryToElement.value.get(entry)
  const targetChanged = menuTarget.value !== target
  if (!targetChanged && isMenuOpen.value) {
    closeEntryMenu()
    return
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

const saveFile = (entry: Entry) => {
  closeEntryMenu()

  const contents = mcfs.readFile(path.current, entry)
  if (!contents)
    return

  saveFileDialogue.saveAsBlob(entry.name, contents)
}

// endregion: save

// region: copy name

const clipboard = useClipboard()

const copyEntryName = (entry: Entry) => {
  if (clipboard.isSupported) {
    clipboard.copy(entry.name)
  }

  closeEntryMenu()
}

// endregion: copy name

// region: rename

const isRenameEntryDialogueOpen  = ref(false)
const renamedEntry = ref<Entry>()

const openRenameEntryDialogue = (entry: Entry) => {
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

const deleteEntryFromMenu = (entry: Entry) => {
  closeEntryMenu()
  dialogNoTransition({
    title: 'Delete',
    message: `Delete ${entry.name}?`,
    cancel: true,
  }).onOk(() => {
    mcfs.deleteEntry(path.current, entry)
    entryList.refresh()
  })
}

// endregion: delete

const itemsInDirectory = (entry: Entry) => {
  const n = isDirectoryEntry(entry)
    ? entry.stat.size - 2 // each directory has `.` and `..` items, don't count them
    : 0;

  return pluralizeItems(n)
}

const formatEntrySize = (entry: Entry) =>
  isFileEntry(entry) ? formatBytes(entry.stat.size) : itemsInDirectory(entry)

const formatDateShort = (time: McStDateTime) => {
  const yyyy = time.year
  const mm = time.month.toString().padStart(2, '0')
  const dd = time.day.toString().padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

const formatDateLong = (time: McStDateTime) => {
  const hh = time.hour.toString().padStart(2, '0')
  const mm = time.min.toString().padStart(2, '0')
  const ss = time.sec.toString().padStart(2, '0')

  return `${formatDateShort(time)} ${hh}:${mm}:${ss}`
}
</script>

<style lang="css" scoped>
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
.entry :deep(.q-item__section--avatar) { padding-left: 16px; }
.entry :deep(.q-item__section--side) { padding-right: 16px; }

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
