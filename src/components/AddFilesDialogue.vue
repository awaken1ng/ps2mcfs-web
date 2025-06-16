<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    persistent
    no-refocus
    no-focus
  >
    <q-card class="q-dialog-plugin">
      <q-card-section class="q-dialog__title">
        Add files
      </q-card-section>

      <q-card-section class="q-dialog__message text-center" v-if="!filesToAdd.length">
        No files selected
      </q-card-section>

      <q-card-section class="q-dialog__message" v-else>
        <q-input
          v-for="item, idx in filesToAdd"
          :key="`${item.file.name}-${item.file.size}`"
          ref="inputs"
          v-model="item.name"
          :placeholder="item.file.name"
          dense
          bottom-slots
          counter
          :maxlength="MAX_NAME_LENGTH"
          :error-message="isNameValid[idx]"
          :error="isNameValid[idx] !== undefined"
          :disable="isWriting"
          :loading="isWriting"
        >
          <template v-slot:before>
            <q-icon name="sym_s_draft" />
          </template>

          <template v-slot:hint>
            <span :title="`${item.file.size} bytes`">
              {{ formatBytes(item.file.size) }}
            </span>
          </template>

          <template v-slot:after>
            <q-btn round dense flat icon="sym_s_delete"
              @click="emit('removeItem', idx)"
              :disable="isWriting"
            />
          </template>
        </q-input>

        <div class="q-field--standard q-field--dense row q-mt-xs">
          <div class="q-field__before q-field__marginal">
            <q-icon/>
          </div>
          <div class="q-field__bottom q-gutter-xs">
            <div v-if="filesToAdd.length > 1">{{ formatBytes(totalFileSize) }} total</div>
            <div>{{ formatBytes(availableSpace) }} available</div>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Remove all" color="primary"
          @click="emit('removeAll')"
          :disable="!filesToAdd.length || isWriting"
        />
        <q-btn flat label="Add file" color="primary"
          @click="emit('addFile')"
          :disable="isWriting"
        />
      </q-card-actions>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" v-close-popup :disable="isWriting" />

        <q-btn
          flat label="Add to card" color="primary"
          @click="emit('addToCard')"
          :disable="!filesToAdd.length || !areNamesValid || isWriting"
          :loading="isWriting"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { Entry, isFileEntry, MAX_NAME_LENGTH } from 'lib/ps2mc'
import { formatBytes } from 'lib/utils'
import { type QInput } from 'quasar'

export interface FileToAdd {
  name: string,
  file: File,
}

const props = defineProps<{
  modelValue: boolean,
  entriesOnCard: Entry[]
  filesToAdd: FileToAdd[],
  isWriting: boolean,
  availableSpace: number,
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'removeItem', idx: number): void
  (event: 'removeAll'): void
  (event: 'addFile'): void
  (event: 'addToCard'): void
}>()

const isNameValid = computed(() =>
  props.filesToAdd.map((file) => {
    if (!file.name)
      return 'Name is empty'

    if (file.name.length > MAX_NAME_LENGTH)
      return 'Name too long'

    const entryWithSameName = props.entriesOnCard.find(entry => entry.name === file.name)
    if (entryWithSameName) {
      return (isFileEntry(entryWithSameName) ? 'File' : 'Directory') + ' with same already exists'
    }

    const fileWithSameName = props.filesToAdd.find(f => f !== file && f.name === file.name)
    if (fileWithSameName) {
      return 'File with same name already selected'
    }
  })
)

const areNamesValid = computed(() => isNameValid.value.every(v => v === undefined))

const inputs = useTemplateRef<QInput[]>('inputs')

watch(
  props.filesToAdd,
  () => {
    if (!inputs.value || !inputs.value.length)
      return

    // when adding a new file, validation isn't run automatically, run it manually
    const lastIdx = inputs.value.length - 1
    const lastInput = inputs.value[lastIdx]!
    lastInput.validate()
  },
  { flush: 'post' }
)

const totalFileSize = computed(() =>
  props.filesToAdd.reduce((total, file) => total + file.file.size, 0))
</script>
