<template>
  <q-btn
    flat no-caps no-wrap :icon="ICON_VMC_NEW" label="New" data-cy="toolbar-vmc-new"
    @click="newMemoryCard"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { DEFAULT_VMC_FILE_NAME } from 'stores/mcfs'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { useMcfs } from 'lib/mcfs'
import { canDiscardUnsavedChanges } from 'lib/dialog'
import { ICON_VMC_NEW } from 'lib/icon'

const mcfs = useMcfs()
const path = usePathStore()
const entryList = useEntryListStore()

const { fileName } = storeToRefs(mcfs.state)

const newMemoryCard = async () => {
  if (!await canDiscardUnsavedChanges('Create new memory card?'))
    return

  path.goToRoot()

  const cardSpecs = mcfs.newCardInMemory()
  if (!cardSpecs)
    return

  fileName.value = DEFAULT_VMC_FILE_NAME
  entryList.refresh()
}
</script>
