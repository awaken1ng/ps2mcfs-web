<template>
  <q-icon :name="icon(entry)" />
</template>

<script setup lang="ts">
import { Entry, isDirectoryEntry } from 'lib/ps2mc'
import { ICON_FILE, ICON_FILE_SELECTED, ICON_FOLDER, ICON_FOLDER_SELECTED } from 'lib/icon'
import { useEntryListStore } from 'stores/entryList'
import { computed } from 'vue'

const props = defineProps<{
  entry: Entry,
  selectionIcons: boolean,
}>()

const entryList = useEntryListStore()

const showSelectionIcon = computed(() => props.selectionIcons && entryList.isSelected(props.entry))

const icon = (entry: Entry) => {
  if (isDirectoryEntry(entry)) {
    return showSelectionIcon.value ? ICON_FOLDER_SELECTED : ICON_FOLDER
  } else {
    return showSelectionIcon.value ? ICON_FILE_SELECTED : ICON_FILE
  }
}
</script>
