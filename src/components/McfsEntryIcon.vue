<template>
  <q-icon :name="icon(entry)" />
</template>

<script setup lang="ts">
import { Entry, isDirectoryEntry } from 'lib/ps2mc'
import { ICON_FILE, ICON_FILE_SELECTED, ICON_FOLDER, ICON_FOLDER_SELECTED } from 'lib/icon'
import { useEntryListStore } from 'stores/entryList'

defineProps<{
  entry: Entry,
  selectionIcons: boolean,
}>()

const entryList = useEntryListStore()

const icon = (entry: Entry) => {
  if (isDirectoryEntry(entry)) {
    return entryList.isSelected(entry) ? ICON_FOLDER_SELECTED : ICON_FOLDER
  } else {
    return entryList.isSelected(entry) ? ICON_FILE_SELECTED : ICON_FILE
  }
}
</script>
