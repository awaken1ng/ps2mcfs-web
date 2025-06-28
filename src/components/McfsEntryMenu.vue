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
import { type Entry, isFileEntry } from 'lib/ps2mc'
import McfsEntryIcon from 'components/McfsEntryIcon.vue'
import { QMenu } from 'quasar'

defineProps<{
  modelValue: boolean,
  entry: Entry | undefined,
  target: HTMLDivElement | undefined,
}>()

const emit = defineEmits<{
  (event: 'saveFile', entry: Entry): void
  (event: 'copyName', entry: Entry): void
  (event: 'rename', entry: Entry): void
  (event: 'delete', entry: Entry): void
  (event: 'escapeKey'): void
}>()

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
