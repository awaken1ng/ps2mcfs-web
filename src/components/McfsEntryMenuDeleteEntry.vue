<template>
  <q-item
    clickable
    @click="deleteSelected"
    data-cy="entry-menu-delete"
  >
    <q-item-section>Delete</q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { McEntryInfo } from 'ps2mcfs-wasm/mcfs'
import { useMcfs } from 'lib/mcfs'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { dialogNoTransition, pluralizeItems } from 'lib/utils'

const props = defineProps<{
  entry: McEntryInfo,
}>()

const mcfs = useMcfs()
const entryList = useEntryListStore()
const path = usePathStore()

const deleteSelected = () => {
  if (!props.entry)
    return

  const selected: McEntryInfo[] = []

  if (entryList.isSelectedNoneOrOne) {
    selected.push(props.entry)
  } else {
    entryList.selected.forEach(entry => selected.push(entry))
  }

  deleteWithPrompt(selected)
}

const deleteWithPrompt = (entries: McEntryInfo[]) => {
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
    entries.forEach(entry => mcfs.deleteEntry({ root: path.current, entry }))
    entryList.refresh()
  })
}
</script>
