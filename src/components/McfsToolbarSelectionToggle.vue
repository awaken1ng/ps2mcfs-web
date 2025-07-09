<template>
  <q-btn
    flat no-caps no-wrap
    :icon="selectOrDeselectIcon" :label="selectOrDeselectTitle" data-cy="toolbar-selectionToggle"
    @click="entryList.toggleSelectionAll" :disabled="!isLoaded || !entries.length"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMcfs } from 'lib/mcfs'
import { useEntryListStore } from 'stores/entryList'
import { storeToRefs } from 'pinia'
import { ICON_ENTRY_DESELECT_ALL, ICON_ENTRY_SELECT_ALL } from 'lib/icon'

const mcfs = useMcfs()
const entryList = useEntryListStore()

const { isLoaded } = storeToRefs(mcfs.state)
const { entries } = storeToRefs(entryList)

const selectOrDeselectIcon = computed(() => entryList.isSelectedAll ? ICON_ENTRY_DESELECT_ALL : ICON_ENTRY_SELECT_ALL)

const selectOrDeselectTitle = computed(() => entryList.isSelectedAll ? 'Deselect all' : 'Select all')
</script>
