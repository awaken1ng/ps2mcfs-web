<template>
  <q-btn
    flat no-caps no-wrap :icon="ICON_VMC_OPEN" label="Open" data-cy="toolbar-open"
    @click="openMemoryCardFromFile"
  />
</template>

<script setup lang="ts">
import { isEccImage, isNonEccImage, useMcfs } from 'lib/ps2mc'
import { canDiscardUnsavedChanges, notifyWarning } from 'lib/utils'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { useFileDialog } from '@vueuse/core'
import { ICON_VMC_OPEN } from 'lib/icon'
import { storeToRefs } from 'pinia'

const mcfs = useMcfs()
const path = usePathStore()
const entryList = useEntryListStore()

const { fileName } = storeToRefs(mcfs.state)

const openMemoryCardDialog = useFileDialog({
  multiple: false,
  reset: true,
  accept: '.bin,.mcd,.mc2,.ps2',
})

const openMemoryCardFromFile = async () => {
  if (!await canDiscardUnsavedChanges('Open new file?'))
    return

  openMemoryCardDialog.open()
}

openMemoryCardDialog.onChange(async (files) => {
  if (!files || files.length !== 1)
    return

  const file = files.item(0)!

  const isValidSize = isNonEccImage(file.size) || isEccImage(file.size)
  if (!isValidSize) {
    notifyWarning({ message: 'Invalid size, not a memory card image, or corrupted' })
    return
  }

  path.goToRoot()

  const buffer = await file.arrayBuffer()
  const array = new Uint8Array(buffer)

  if (!mcfs.openCardFromMemory(array))
    return

  fileName.value = file.name
  entryList.refresh()
})
</script>
