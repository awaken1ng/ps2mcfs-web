<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    transition-duration="0"
  >
    <q-card class="q-dialog-plugin">
      <q-card-section class="q-dialog__title">
        Create new directory
      </q-card-section>

      <q-card-section class="q-dialog__message">
        New directory name:

        <q-input
          v-model="name"
          dense
          autofocus
          bottom-slots
          :maxlength="MAX_NAME_LENGTH"
          counter
          :error-message="nameInvalidReason"
          :error="!isNameValid"
        >
          <template v-slot:before>
            <q-icon name="sym_s_folder" />
          </template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />

        <q-btn
          flat label="Create" color="primary"
          @click="makeDirectory"
          :disable="!isNameValid"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MAX_NAME_LENGTH, isEntryNameLegal, isFileEntry, Entry } from 'lib/ps2mc'
import { QInput } from 'quasar';

const props = defineProps<{
  modelValue: boolean,
  entriesOnCard: Entry[]
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'makeDirectory', dirName: string): void
}>()

const name = ref('')

const nameInvalidReason = computed(() => {
  const reason = isEntryNameLegal(name.value)
  if (reason !== true)
    return reason

  const entryWithSameName = props.entriesOnCard.find(entry => entry.name === name.value)
  if (entryWithSameName)
    return (isFileEntry(entryWithSameName) ? 'File' : 'Directory') + ' with same name already exists'

  return undefined
})

const isNameValid = computed(() => nameInvalidReason.value === undefined)

watch(props, () => {
  if (props.modelValue) {
    // reset name when opening dialogue
    name.value = ''
  }
})

const makeDirectory = () => {
  emit('makeDirectory', name.value)
  name.value = ''
}
</script>
