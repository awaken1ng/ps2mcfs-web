<template>
  <q-btn
    flat no-caps no-wrap
    :icon="ICON_VMC_IMPORT_PSU"
    label="Import .psu"
    @click="openImportPsuDialog"
    :disable="!isLoaded"
    data-cy="toolbar-importPsu"
  />

  <DialogueImportPsu
    v-model="isImportPsuDialogueOpen"
    :file-name="psuName"
    :psu="psu"
    :availableSpace="availableSpace"
    :is-writing="isWriting"
    @import="importSelectedPsu"
  />
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import DialogueImportPsu from 'components/DialogueImportPsu.vue'
import { useMcfs } from 'lib/ps2mc'
import { notifyWarning } from 'lib/utils'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { storeToRefs } from 'pinia'
import { useFileDialog } from '@vueuse/core'
import { type Psu, readPsu } from 'src/lib/psu'
import { ICON_VMC_IMPORT_PSU } from 'lib/icon'

const mcfs = useMcfs()
const entryList = useEntryListStore()
const path = usePathStore()

const { isLoaded, availableSpace } = storeToRefs(mcfs.state)

const openPsuFileDialog = useFileDialog({
  multiple: false,
  reset: true,
  accept: '.psu',
})

const isImportPsuDialogueOpen = ref(false)

const openImportPsuDialog = () => {
  openPsuFileDialog.open()
}

openPsuFileDialog.onChange(async (files) => {
  if (!files || files.length !== 1)
    return

  const file = files.item(0)!
  const arrayBuffer = await file.arrayBuffer()
  const contents = new Uint8Array(arrayBuffer)

  psuName.value = file.name
  psu.value = readPsu(contents)
  if (!psu.value)
    return

  const filesSize = psu.value.entries.reduce((total, entry) => total + entry.stat.size, 0)
  if (filesSize > availableSpace.value) {
    notifyWarning({ message: `Not enough free space on the card` })
    return
  }

  isImportPsuDialogueOpen.value = true
})

const isWriting = ref(false)
const psu = ref<Psu>()
const psuName = ref('')

watchEffect(() => {
  if (isImportPsuDialogueOpen.value)
    return

  // unset .psu when closing the import dialog
  psu.value = undefined
})

const importSelectedPsu = (overwrite: boolean) => {
  if (!psu.value)
    return

  try {
    isWriting.value = true
    mcfs.importDirectoryFromPsu({ psu: psu.value, overwrite })
    entryList.refresh()
  } finally {
    isImportPsuDialogueOpen.value = false
    isWriting.value = false
  }
}
</script>
