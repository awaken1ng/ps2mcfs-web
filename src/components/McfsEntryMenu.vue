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

    <q-item
      v-if="isSelectedNoneOrOne && isFileEntry(entry)"
      clickable @click="emit('saveFile', entry)"
      data-cy="entry-menu-saveFile"
    >
      <q-item-section>Save file</q-item-section>
    </q-item>

    <q-item
      v-if="path.isRoot && isSelectedNoneOrOne && isDirectoryEntry(entry)"
      clickable @click="emit('exportPsu', entry)"
      data-cy="entry-menu-exportPsu"
    >
      <q-item-section>Export as .psu</q-item-section>
    </q-item>

    <q-item
      v-if="isSelectedNoneOrOne"
      clickable @click="emit('copyName', entry)"
      data-cy="entry-menu-copyName"
    >
      <q-item-section>Copy name</q-item-section>
    </q-item>

    <q-item
      v-if="isSelectedNoneOrOne"
      clickable @click="emit('rename', entry)"
      data-cy="entry-menu-rename"
    >
      <q-item-section>Rename</q-item-section>
    </q-item>

    <q-item
      clickable @click="emitDelete"
      data-cy="entry-menu-delete"
    >
      <q-item-section>Delete</q-item-section>
    </q-item>
  </q-menu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isFileEntry, isDirectoryEntry } from 'lib/ps2mc'
import McfsEntryIcon from 'components/McfsEntryIcon.vue'
import { QMenu } from 'quasar'
import { useEntryListStore } from 'stores/entryList'
import { itemsForm } from 'lib/utils'
import { usePathStore } from 'stores/path'
import { McEntryInfo } from 'ps2mcfs-wasm/mcfs'

const props = defineProps<{
  modelValue: boolean,
  entry: McEntryInfo | undefined,
  target: HTMLDivElement | undefined,
}>()

const emit = defineEmits<{
  (event: 'saveFile', entry: McEntryInfo): void
  (event: 'exportPsu', entry: McEntryInfo): void
  (event: 'copyName', entry: McEntryInfo): void
  (event: 'rename', entry: McEntryInfo): void
  (event: 'delete', entry: McEntryInfo[]): void
  (event: 'escapeKey'): void
}>()

const entryList = useEntryListStore()
const path = usePathStore()

const isSelectedNoneOrOne = computed(() => entryList.selected.size <= 1)

const emitDelete = () => {
  if (!props.entry)
    return

  const selected: McEntryInfo[] = []

  if (isSelectedNoneOrOne.value) {
    selected.push(props.entry)
  } else {
    entryList.selected.forEach(entry => selected.push(entry))
  }

  emit('delete', selected)
}

const qmenu = ref<QMenu>()

defineExpose({
  qmenu
})
</script>

<style lang="css" scoped>
.entry { padding: 0; }
.entry .q-item__section--avatar { padding-left: 16px; }
.entry .q-item__section--main { padding-right: 16px; }
</style>
