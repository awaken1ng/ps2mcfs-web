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

        <q-form
          autocomplete="off"
          @submit.prevent="makeDirectory"
        >
          <q-input
            v-model="name"
            type="text"
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
      </q-form>

      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup />

        <q-btn
          flat label="Create" color="primary"
          @click="makeDirectory"
          :disable="!isNameValid"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isEntryNameLegal, MAX_NAME_LENGTH } from 'lib/mcfs/utils'
import { isFileEntry } from 'lib/mcfs/attributes'
import { useMcfs } from 'lib/mcfs'
import { useEntryListStore } from 'stores/entryList'
import { usePathStore } from 'stores/path'
import { ICON_ENTRY_FOLDER } from 'lib/icon'

const props = defineProps<{
  modelValue: boolean,
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'makeDirectory', dirName: string): void
}>()

const mcfs = useMcfs()
const entryList = useEntryListStore()
const path = usePathStore()

const name = ref('')

const nameInvalidReason = computed(() => {
  const reason = isEntryNameLegal(name.value)
  if (reason !== true)
    return reason

  const entryWithSameName = entryList.entries.find(entry => entry.name === name.value)
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
  // submit from form (e.g. on Enter) doesn't do validation
  if (!isNameValid.value)
    return

  const dirPath = path.join(name.value)
  mcfs.createDirectory({ dirPath: dirPath, existsOk: false })
  entryList.refresh()
  name.value = ''
  emit('update:modelValue', false)
}
</script>
