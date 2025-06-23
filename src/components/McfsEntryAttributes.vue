<template>
  <div class="attributes">
    <span v-if="isEntryReadable(entry)" title="Readable">R</span>
    <span v-if="isEntryWriteable(entry)" title="Writeable">W</span>
    <span v-if="isEntryExecutale(entry)" title="Executable">X</span>
    <span v-if="isEntryProtected(entry)" title="Copy protected">P</span>
    <span v-if="isEntryHidden(entry)" title="Hidden">H</span>
    <span v-if="isPs1Save(entry)" title="PlayStation 1">PS1</span>
    <span v-if="isPocketStationSave(entry)" title="PocketStation">PS</span>
  </div>
</template>

<script setup lang="ts">
import {
  type Entry,
  isEntryReadable, isEntryWriteable, isEntryExecutale, isEntryProtected,
  isEntryHidden, isPs1Save, isPocketStationSave,
} from 'lib/ps2mc'

defineProps<{
  entry: Entry
}>()
</script>

<style lang="css" scoped>
.attributes {
  display: flex;
  gap: 0.25rem;
}
</style>
