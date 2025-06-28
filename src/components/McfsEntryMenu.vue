<template>
  <!-- deliberately stub @update:model-value -->
  <q-menu
  v-if="entry"
    ref="qmenu"
    :model-value="modelValue"
    @update:model-value="() => {}"
    class="non-selectable"
    :target="target"
    anchor="bottom end" self="top end"
    transition-duration="0"
    @escape-key="emit('escapeKey')"
  >
    <q-item class="entry">
      <q-item-section avatar>
        <McfsEntryIcon :entry="entry" :selection-icons="false" />
      </q-item-section>

      <q-item-section>
        <q-item-label>
          {{ entry.name }}
        </q-item-label>
      </q-item-section>
    </q-item>

    <q-separator />

    <q-item clickable v-if="isFileEntry(entry!)" @click="emit('saveFile', entry!)" data-cy="entry-menu-saveFile">
      <q-item-section>Save file</q-item-section>
    </q-item>

    <q-item
      v-if="path.isRoot && isDirectoryEntry(entry)"
      clickable @click="emit('exportPsu', entry)"
      data-cy="entry-menu-exportPsu"
    >
      <q-item-section>Export as .psu</q-item-section>
    </q-item>

    <q-item clickable @click="emit('copyName', entry)" data-cy="entry-menu-copyName">
      <q-item-section>Copy name</q-item-section>
    </q-item>

    <q-item clickable @click="emit('rename', entry)" data-cy="entry-menu-rename">
      <q-item-section>Rename</q-item-section>
    </q-item>

    <q-item clickable @click="emit('delete', entry)" data-cy="entry-menu-delete">
      <q-item-section>Delete</q-item-section>
    </q-item>
  </q-menu>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { isFileEntry, isDirectoryEntry } from 'lib/ps2mc'
import McfsEntryIcon from 'components/McfsEntryIcon.vue'
import { QMenu } from 'quasar'
import { usePathStore } from 'src/stores/path'
import { McEntryInfo } from 'lib/mcfs'

defineProps<{
  modelValue: boolean,
  entry: McEntryInfo | undefined,
  target: HTMLDivElement | undefined,
}>()

const emit = defineEmits<{
  (event: 'saveFile', entry: McEntryInfo): void
  (event: 'exportPsu', entry: McEntryInfo): void
  (event: 'copyName', entry: McEntryInfo): void
  (event: 'rename', entry: McEntryInfo): void
  (event: 'delete', entry: McEntryInfo): void
  (event: 'escapeKey'): void
}>()

const path = usePathStore()

const qmenu = ref<QMenu>()

defineExpose({
  qmenu
})
</script>

<style lang="css">
.entry { padding: 0; }
.entry .q-item__section--avatar { padding-left: 16px; }
.entry .q-item__section--main { padding-right: 16px; }
</style>
