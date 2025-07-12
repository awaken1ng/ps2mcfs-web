<template>
  <q-dialog
    :model-value="payload !== undefined"
    transition-duration="0"
    @hide="hide"
  >
    <q-card class="q-dialog-plugin">
      <q-card-section class="q-dialog__title">
        Rename {{ entryType }}
      </q-card-section>

      <q-card-section class="q-dialog__message">
        New {{ entryType }} name:

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
import { computed, ref } from 'vue'
import { isEntryNameLegal, MAX_NAME_LENGTH } from 'lib/mcfs/utils'
import { isFileEntry } from 'lib/mcfs/attributes'
import { useEntryListStore } from 'stores/entryList'
import { type McEntryInfo } from 'ps2mcfs-wasm/mcfs'
import { ICON_ENTRY_FOLDER } from 'lib/icon'

const entryList = useEntryListStore()

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

interface Payload {
  entry: McEntryInfo,
  onOk: (newName: string) => void,
}

const payload = ref<Payload>()

const show = (showPayload: Payload) => {
  name.value = showPayload.entry.name
  payload.value = showPayload
}

const hide = () => {
  payload.value = undefined
}

defineExpose({
  show,
  hide
})

const renameEntry = () => {
  payload.value?.onOk(name.value)
  hide()
}

const entryType = computed(() =>  {
  if (!payload.value?.entry)
    return ''

  if (isFileEntry(payload.value.entry))
    return 'file'

  return 'directory'
})
</script>
