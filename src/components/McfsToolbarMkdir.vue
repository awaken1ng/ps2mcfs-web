<template>
  <q-btn
    flat no-caps no-wrap :icon="ICON_VMC_MKDIR" label="Create new directory" data-cy="toolbar-mkdir"
    @click="openMakeDirectoryDialogue" :disabled="!isLoaded || (!allowCreatingSubdirectories && !path.isRoot)"
  />

  <DialogueMkdir
    v-model="isMakeDirectoryDialogueOpen"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import DialogueMkdir from 'components/DialogueMkdir.vue'
import { ICON_VMC_MKDIR } from 'lib/icon'
import { useMcfs } from 'lib/mcfs'
import { usePathStore } from 'stores/path'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'

const mcfs = useMcfs()
const path = usePathStore()
const route = useRoute()

const { isLoaded } = storeToRefs(mcfs.state)

const isMakeDirectoryDialogueOpen = ref(false)

const openMakeDirectoryDialogue = () => {
  isMakeDirectoryDialogueOpen.value = true
}

const allowCreatingSubdirectories = computed(() => 'allowCreatingSubdirectories' in route.query)
</script>
