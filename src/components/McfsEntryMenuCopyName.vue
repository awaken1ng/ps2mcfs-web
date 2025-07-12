<template>
  <q-item
    v-if="entryList.isSelectedNoneOrOne"
    clickable
    @click="copyEntryName"
    data-cy="entry-menu-copyName"
  >
    <q-item-section>Copy name</q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { McEntryInfo } from 'ps2mcfs-wasm/mcfs'
import { useEntryListStore } from 'stores/entryList'
import { useClipboard } from '@vueuse/core'

const props = defineProps<{
  entry: McEntryInfo,
}>()

const entryList = useEntryListStore()
const clipboard = useClipboard()

const copyEntryName = () => {
  if (clipboard.isSupported) {
    clipboard.copy(props.entry.name)
  }
}
</script>
