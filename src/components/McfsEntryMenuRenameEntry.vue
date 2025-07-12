<template>
  <q-item
    v-if="entryList.isSelectedNoneOrOne"
    clickable
    @click="openRenameEntryDialogue"
    data-cy="entry-menu-rename"
  >
    <q-item-section>Rename</q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { McEntryInfo } from 'ps2mcfs-wasm/mcfs'
import { useMcfs } from 'lib/mcfs'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { injectRenameEntryDialog } from 'lib/dialog'

const props = defineProps<{
  entry: McEntryInfo,
}>()

const mcfs = useMcfs()
const entryList = useEntryListStore()
const path = usePathStore()
const dialog = injectRenameEntryDialog()

const openRenameEntryDialogue = () => {
  dialog.value.show({
    entry: props.entry,
    onOk: renameEntryFromMenu,
  })
}

const renameEntryFromMenu = (newName: string) => {
  mcfs.renameEntry({ root: path.current, entry: props.entry, newName })
  entryList.refresh()
}
</script>
