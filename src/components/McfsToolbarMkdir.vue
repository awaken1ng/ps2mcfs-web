<template>
  <q-btn
    flat no-caps no-wrap :icon="ICON_VMC_MKDIR" label="Create new directory" data-cy="toolbar-mkdir"
    @click="openMakeDirectoryDialogue" :disabled="!isLoaded || !path.isRoot"
  />

  <DialogueMkdir
    v-model="isMakeDirectoryDialogueOpen"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DialogueMkdir from 'components/DialogueMkdir.vue'
import { ICON_VMC_MKDIR } from 'lib/icon'
import { useMcfs } from 'lib/mcfs'
import { usePathStore } from 'stores/path'
import { storeToRefs } from 'pinia'

const mcfs = useMcfs()
const path = usePathStore()

const { isLoaded } = storeToRefs(mcfs.state)

const isMakeDirectoryDialogueOpen = ref(false)

const openMakeDirectoryDialogue = () => {
  isMakeDirectoryDialogueOpen.value = true
}
</script>
