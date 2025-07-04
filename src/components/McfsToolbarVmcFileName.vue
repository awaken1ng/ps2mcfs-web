<template>
  <div v-if="isLoaded" class="file-name" data-cy="file-name">
    {{ fileName }} <span v-if="hasUnsavedChanges" class="non-selectable">*</span>
  </div>
  <q-skeleton v-else animation="none" width="10rem" data-cy="file-name-skeleton" />
</template>

<script setup lang="ts">
import { useMcfs } from 'lib/ps2mc'
import { storeToRefs } from 'pinia'

const mcfs = useMcfs()

const { isLoaded, hasUnsavedChanges, fileName } = storeToRefs(mcfs.state)
</script>
