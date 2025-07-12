<template>
  <q-item
    clickable
    @click="exportEntries"
    data-cy="entry-menu-exportZip"
  >
    <q-item-section>Export as .zip</q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { McEntryInfo } from 'ps2mcfs-wasm/mcfs'
import { useMcfs } from 'lib/mcfs'
import { isFileEntry } from 'lib/mcfs/attributes'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { useSaveFileDialog } from 'lib/file'
import { Uint8ArrayReader, BlobWriter, ZipWriter } from '@zip.js/zip.js'
import { joinPath } from 'lib/mcfs/utils'
import { dialogSaveAs } from 'lib/dialog'

const props = defineProps<{
  entry: McEntryInfo,
}>()

const mcfs = useMcfs()
const entryList = useEntryListStore()
const path = usePathStore()
const saveFileDialogue = useSaveFileDialog()

const exportEntries = () => {
  const selected: McEntryInfo[] = []

  if (props.entry) {
    if (entryList.isSelectedNoneOrOne) {
      selected.push(props.entry)
    } else {
      entryList.selected.forEach(entry => selected.push(entry))
    }
  }

  const zipName = selected.length === 1
    ? selected[0]!.name
    : path.isRoot
        ? mcfs.state.fileName
        : path.components.at(-1)!

  dialogSaveAs({
    title: 'Export .zip',
    fileName: `${zipName}.zip`,
    onOk: (fileName) => {
      exportEntriesToZip(fileName, selected)
    },
  })
}

const exportEntriesToZip = async (zipName: string,  entries: McEntryInfo[]) => {
  const zipFileWriter = new BlobWriter()
  const zipWriter = new ZipWriter(zipFileWriter)

  for (const entry of entries) {
    if (isFileEntry(entry)) {
      await addFileEntryToZip(zipWriter, entry.name, path.current, entry)
    } else {
      await addDirectoryEntryToZip(zipWriter, entry)
    }
  }

  await zipWriter.close()

  const blob = await zipFileWriter.getData()
  const arrayBuffer = await blob.arrayBuffer()
  const data = new Uint8Array(arrayBuffer)

  saveFileDialogue.saveAsBlob(zipName, data)
}

const addFileEntryToZip = async <T>(zipWriter: ZipWriter<T>, zipFilePath: string, fileRoot: string, fileEntry: McEntryInfo) => {
  const file = mcfs.readFileEntry({ root: fileRoot, entry: fileEntry })
  if (!file)
    return

  const reader = new Uint8ArrayReader(file)
  await zipWriter.add(zipFilePath, reader)
}

const addDirectoryEntryToZip = async <T>(zipWriter: ZipWriter<T>, dirEntry: McEntryInfo) => {
  await zipWriter.add(dirEntry.name, undefined, { directory: true })

  const dirPath = path.join(dirEntry.name)
  for (const { root, directories, files } of mcfs.walkDirectory({ dirPath })) {
    for (const entry of files) {
      await addFileEntryToZip(zipWriter, joinPath(root, entry.name), root, entry)
    }

    for (const entry of directories) {
      const subdirPath = joinPath(root, entry.name)
      await zipWriter.add(subdirPath, undefined, { directory: true })
    }
  }
}
</script>
