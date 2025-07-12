<template>
  <q-item
    v-if="entryList.isSelectedNoneOrOne && isFileEntry(entry)"
    clickable
    @click="saveFile"
    data-cy="entry-menu-saveFile"
  >
    <q-item-section>Save file</q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { useMcfs } from 'lib/mcfs'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { useSaveFileDialog } from 'lib/file'
import { McEntryInfo } from 'ps2mcfs-wasm/mcfs'
import { isFileEntry } from 'lib/mcfs/attributes'

const props = defineProps<{
  entry: McEntryInfo,
}>()

const mcfs = useMcfs()
const entryList = useEntryListStore()
const path = usePathStore()
const saveFileDialogue = useSaveFileDialog()

const saveFile = () => {
  const contents = mcfs.readFileEntry({ root: path.current, entry: props.entry })
  if (!contents)
    return

  saveFileDialogue.saveAsBlob(props.entry.name, contents)
}
</script>
