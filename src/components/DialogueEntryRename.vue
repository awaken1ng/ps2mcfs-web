<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    transition-duration="0"
  >
    <q-card class="q-dialog-plugin">
      <q-card-section class="q-dialog__title">
        Rename {{ entryType }}
      </q-card-section>

      <q-card-section class="q-dialog__message">
        New {{ entryType }} name:

        <q-input
          v-model="newName"
          dense
          autofocus
          bottom-slots
          :maxlength="MAX_NAME_LENGTH"
          counter
          :error-message="nameInvalidReason"
          :error="!isNameValid"
        >
          <template v-slot:before>
            <q-icon :name="ICON_ENTRY_FOLDER" />
          </template>
        </q-input>

      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />

        <q-btn
          flat label="Rename" color="primary"
          @click="renameEntry"
          :disable="!isNameValid"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MAX_NAME_LENGTH, isEntryNameLegal, isFileEntry } from 'lib/ps2mc'
import { useEntryListStore } from 'stores/entryList'
import { type McEntryInfo } from 'ps2mcfs-wasm/mcfs'
import { ICON_ENTRY_FOLDER } from 'lib/icon'

const props = defineProps<{
  modelValue: boolean,
  entry: McEntryInfo | undefined,
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'renameEntry', newName: string): void
}>()

const entryList = useEntryListStore()

const newName = ref('')

const nameInvalidReason = computed(() => {
  const reason = isEntryNameLegal(newName.value)
  if (reason !== true)
    return reason

  const entryWithSameName = entryList.entries.find(entry => entry.name === newName.value)
  if (entryWithSameName)
    return (isFileEntry(entryWithSameName) ? 'File' : 'Directory') + ' with same name already exists'

  return undefined
})

const isNameValid = computed(() => nameInvalidReason.value === undefined)

watch(props, () => {
  if (props.modelValue) {
    newName.value = props.entry!.name
  }
})

const renameEntry = () => {
  emit('renameEntry', newName.value)
  newName.value = ''
}

const entryType = computed(() =>  {
  if (!props.entry)
    return ''

  if (isFileEntry(props.entry))
    return 'file'

  return 'directory'
})
</script>
