<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    transition-duration="0"
    :persistent="isWriting"
  >
    <q-card class="q-dialog-plugin">
      <q-card-section class="q-dialog__title">
        Save memory card
      </q-card-section>

      <q-card-section class="q-dialog__message">
        <div v-if="isWriting">
          <div>
            Exporting:
            <span class="text-weight-medium">{{ bytesExportedFormatted }}</span>
            /
            <span class="text-weight-medium">{{ bytesToExportFormatted }}</span>
          </div>
          <q-linear-progress :value="exportProgress" rounded class="q-mt-md" />
        </div>

        <div v-else>
          File name:
          <q-input
            v-model="fileName"
            dense
            autofocus
            bottom-slots
            counter
            data-cy="dialog-vmc-save-fileName"
          >
            <template v-slot:before>
              <q-icon :name="ICON_ENTRY_FILE" />
            </template>
          </q-input>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat label="Cancel" color="primary"
          :disable="isWriting" v-close-popup
        />

        <q-btn-dropdown
          flat
          split
          :disable="isWriting"
          :loading="isWriting"
          color="primary"
          label="Save without ECC"
          @click="saveCard(false)"
          data-cy="dialog-vmc-save-withoutEcc"
        >
          <q-list>
            <q-item
              clickable
              @click="saveCard(true)"
              data-cy="dialog-vmc-save-withEcc"
            >
              <q-item-section>
                <q-item-label>Save with ECC</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ICON_ENTRY_FILE } from 'lib/icon'
import { formatBytes } from 'lib/utils'

const props = defineProps<{
  modelValue: boolean,
  initialName: string,
  isWriting: boolean,
  bytesExported: number
  bytesToExport: number
}>()

const isWriting = computed(() => props.bytesToExport > 0)

const exportProgress = computed(() => props.bytesExported / props.bytesToExport)

const bytesExportedFormatted = computed(() => formatBytes(props.bytesExported))

const bytesToExportFormatted = computed(() => formatBytes(props.bytesToExport))

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'saveCard', name: string, withEcc: boolean): void
}>()

const fileName = ref('')

watch(props, () => {
  if (props.modelValue) {
    fileName.value = props.initialName
  }
})

const saveCard = (withEcc: boolean) => {
  emit('saveCard', fileName.value, withEcc)
}
</script>
