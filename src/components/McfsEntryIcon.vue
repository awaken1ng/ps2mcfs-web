<template>
  <q-icon :name="icon(entry)" />
</template>

<script setup lang="ts">
import { Entry, isDirectoryEntry } from 'lib/ps2mc'
import { useEntryListStore } from 'stores/entryList'

defineProps<{
  entry: Entry
}>()

const entryList = useEntryListStore()

const icon = (entry: Entry) => {
  if (isDirectoryEntry(entry)) {
    return entryList.isSelected(entry) ? 'sym_s_folder_check' : 'sym_s_folder'
  } else {
    return entryList.isSelected(entry) ? 'sym_s_task' : 'sym_s_draft'
  }
}
</script>
