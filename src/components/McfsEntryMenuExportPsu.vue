<template>
  <q-item
    v-if="path.isRoot && entryList.isSelectedNoneOrOne && isDirectoryEntry(entry)"
    clickable
    @click="exportPsu"
    data-cy="entry-menu-exportPsu"
  >
    <q-item-section>Export as .psu</q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { McEntryInfo } from 'ps2mcfs-wasm/mcfs'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { useSaveFileDialog } from 'lib/file'
import { useMcfs } from 'lib/mcfs'
import { isDirectoryEntry } from 'lib/mcfs/attributes'
import { joinPath } from 'lib/mcfs/utils'
import { dialogSaveAs } from 'lib/utils'

const props = defineProps<{
  entry: McEntryInfo,
}>()

const mcfs = useMcfs()
const entryList = useEntryListStore()
const path = usePathStore()
const saveFileDialogue = useSaveFileDialog()

const exportPsu = () => {
  if (!isDirectoryEntry(props.entry))
    return

  const dirPath = joinPath('/', props.entry.name)
  const psu = mcfs.exportDirectoryAsPsu({ dirPath: dirPath })
  if (!psu)
    return

  dialogSaveAs({
    title: 'Export .psu',
    fileName: `${props.entry.name}.psu`,
    onOk: (fileName) => {
      saveFileDialogue.saveAsBlob(fileName, psu)
    },
  })
}
</script>
