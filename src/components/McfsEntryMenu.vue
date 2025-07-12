<template>
  <!-- deliberately stub @update:model-value -->
  <!-- if its present QMenu doesn't use internal model value management, which is what we want -->
  <q-menu
    v-if="entry"
    ref="qmenu"
    :model-value="modelValue"
    @update:model-value="() => {}"
    class="non-selectable"
    :target="target"
    anchor="bottom end" self="top end"
    transition-duration="0"
    @escape-key="close"
  >
    <!-- if there are multiple entries selected, show "Selected N items" -->
    <q-item v-if="entryList.selected.size >= 2" class="entry" >
      <!-- spacer to match left side padding with right side -->
      <div class="q-pl-md"></div>

      <q-item-section>
        <q-item-label class="text-primary">
          Selected <span class="text-bold">{{ entryList.selected.size }}</span> {{ itemsForm(entryList.selected.size) }}
        </q-item-label>
      </q-item-section>
    </q-item>
    <!-- otherwise show an entry icon and its name -->
    <q-item v-else class="entry" :class="{ 'text-primary': entryList.selected.has(entry) }">
      <q-item-section avatar>
        <McfsEntryIcon :entry="entry" :selection-icons="true" />
      </q-item-section>

      <q-item-section>
        <q-item-label>
          {{ entry.name }}
        </q-item-label>
      </q-item-section>
    </q-item>

    <q-separator />

    <McfsEntryMenuSaveFile :entry @click="close" />
    <McfsEntryMenuExportPsu :entry @click="close" />
    <McfsEntryMenuCopyName :entry @click="close" />
    <McfsEntryMenuRenameEntry :entry @click="close" />
    <McfsEntryMenuDeleteEntry :entry @click="close" />
  </q-menu>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import McfsEntryIcon from 'components/McfsEntryIcon.vue'
import McfsEntryMenuSaveFile from 'components/McfsEntryMenuSaveFile.vue'
import McfsEntryMenuExportPsu from 'components/McfsEntryMenuExportPsu.vue'
import McfsEntryMenuCopyName from 'components/McfsEntryMenuCopyName.vue'
import McfsEntryMenuRenameEntry from 'components/McfsEntryMenuRenameEntry.vue'
import McfsEntryMenuDeleteEntry from 'components/McfsEntryMenuDeleteEntry.vue'
import { QMenu } from 'quasar'
import { useEntryListStore } from 'stores/entryList'
import { itemsForm } from 'lib/utils'
import { McEntryInfo } from 'ps2mcfs-wasm/mcfs'

defineProps<{
  modelValue: boolean,
  entry: McEntryInfo | undefined,
  target: HTMLDivElement | undefined,
}>()

const emit = defineEmits<{
  (event: 'close'): void
}>()

const entryList = useEntryListStore()

const close = () => emit('close')

const qmenu = ref<QMenu>()

// expose QMenu to be able to call `updatePosition`
defineExpose({
  qmenu
})
</script>

<style lang="css" scoped>
.entry { padding: 0; }
.entry .q-item__section--avatar { padding-left: 16px; }
.entry .q-item__section--main { padding-right: 16px; }
</style>
