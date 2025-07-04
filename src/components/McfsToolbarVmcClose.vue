<template>
  <q-btn
    flat no-caps no-wrap :icon="ICON_VMC_CLOSE" label="Close" data-cy="toolbar-close"
    @click="closeMemoryCard" :disable="!isLoaded"
  />
</template>

<script setup lang="ts">
import { useMcfs } from 'lib/ps2mc'
import { canDiscardUnsavedChanges } from 'lib/utils'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { storeToRefs } from 'pinia'
import { ICON_VMC_CLOSE } from 'lib/icon'

const DEFAULT_FILENAME = 'ps2-memory-card.bin'

const mcfs = useMcfs()
const path = usePathStore()
const entryList = useEntryListStore()

const { isLoaded, fileName } = storeToRefs(mcfs.state)

const closeMemoryCard = async () => {
  if (!await canDiscardUnsavedChanges('Close the card?'))
    return

  fileName.value = DEFAULT_FILENAME
  path.goToRoot()
  mcfs.closeCard()
  entryList.set([])
}
</script>
