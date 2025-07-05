<template>
  <q-dialog
    v-if="psu"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    transition-duration="0"
    persistent
  >
    <q-card class="q-dialog-plugin">
      <q-card-section class="q-dialog__title">
        Import .psu
      </q-card-section>

      <q-card-section class="q-dialog__message">
        <div class="q-ml-sm q-mb-sm text-subtitle1">
          <span class="text-weight-medium">{{ fileName }}</span> contains following items:
        </div>

        <q-list
          bordered
          separator
        >
          <McfsEntryItem
            :entry="psu.directory"
            :clickable="false"
            :menu="false"
          />

          <q-separator/>
          <q-separator/>

          <McfsEntryItem
            v-for="entry, idx in psu.entries"
            :key="idx"
            :entry="entry"
            :clickable="false"
            :menu="false"
            :error-message="isFileAlreadyPresent[idx] ? 'File already exists' : undefined"
          />
        </q-list>

        <div class="q-field--dense">
          <div class="q-field__bottom q-gutter-xs">
            <div v-if="psu.entries.length">{{ formatBytes(totalFileSize) }} total</div>
            <div>{{ formatBytes(availableSpace) }} available</div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />

        <q-btn-dropdown
          flat
          split
          :disable="!psu.entries.length || isWriting"
          :loading="isWriting"
          color="primary"
          label="Import without overwrite"
          @click="emit('import', false)"
          data-cy="dialog-import-psu-withoutOverwite"
        >
          <q-list>
            <q-item
              clickable
              v-close-popup
              @click="emit('import', true)"
              data-cy="dialog-import-psu-withOverwite"
            >
              <q-item-section>
                <q-item-label>Import with overwrite</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { type Psu } from 'lib/psu'
import { formatBytes, joinPath } from 'lib/utils'
import { computed } from 'vue'
import McfsEntryItem from 'components/McfsEntryItem.vue'
import { usePathStore } from 'stores/path'
import { useMcfs } from 'lib/ps2mc'
import { useEntryListStore } from 'stores/entryList'

const props = defineProps<{
  modelValue: boolean,
  fileName: string,
  psu: Psu | undefined,
  availableSpace: number,
  isWriting: boolean,
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'import', overwrite: boolean): void
}>()

const mcfs = useMcfs()
const path = usePathStore()
const entryList = useEntryListStore()

const rootEntries = computed(() => {
  if (!mcfs.state.isLoaded)
    return []

  if (path.isRoot)
    return entryList.entries

  return mcfs.readDirectory('/')
})

const dirEntries = computed(() => {
  if (!props.psu)
    return []

  return mcfs.readDirectory(joinPath('/', props.psu.directory.name))
})

const isDirAlreadyPresent = computed(() => {
  if (!props.psu)
    return true

  const directoryWithSameName = rootEntries.value.find(entry => entry.name === props.psu!.directory.name)
  return Boolean(directoryWithSameName)
})

const isFileAlreadyPresent = computed(() => {
  if (!props.psu)
    return []
  if (!isDirAlreadyPresent.value)
    return Array(props.psu.entries.length).fill(false)

  return props.psu.entries
    .map(psuEntry => {
      const fileWithSameName = dirEntries.value.find(dirEntry => dirEntry.name === psuEntry.name)
      return Boolean(fileWithSameName)
    })
})

const totalFileSize = computed(() =>
  props.psu?.entries.reduce((total, entry) => total + entry.stat.size, 0) || 0
)
</script>

<style lang="css" scoped>
@media (min-width: 600px) {
  .q-dialog-plugin {
    min-width: 560px;
  }
}
</style>
