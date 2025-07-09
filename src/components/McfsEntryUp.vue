<template>
  <q-item
    v-if="isLoaded && !isLoading"
    class="entry non-selectable"
    clickable
    :manual-focus="path.isRoot"
    :style="cursorOverride"
    :v-ripple="!path.isRoot"
  >
    <template v-if="!path.isRoot">
      <q-item-section avatar >
        <q-icon :name="ICON_ENTRY_GO_UP" />
      </q-item-section>

      <q-item-section>
        ..
      </q-item-section>

      <q-item-section side>
        <div>
          <span :title="`${availableSpace} bytes`">{{ formatBytes(availableSpace) }}</span>
          free of
          <span :title="`${cardSize} bytes`">{{ formatBytes(cardSize) }}</span>
        </div>
      </q-item-section>
    </template>

    <template v-else>
      <q-item-section class="items-center text-grey-7">
        <div>
          <span :title="`${availableSpace} bytes`">{{ formatBytes(availableSpace) }}</span>
          free of
          <span :title="`${cardSize} bytes`">{{ formatBytes(cardSize) }}</span>
        </div>
      </q-item-section>
    </template>
  </q-item>
</template>

<script setup lang="ts">
import { useMcfs } from 'lib/mcfs'
import { formatBytes } from 'lib/utils'
import { usePathStore } from 'stores/path'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { ICON_ENTRY_GO_UP } from 'lib/icon'

const mcfs = useMcfs()
const { isLoading, isLoaded, availableSpace, cardSize } = storeToRefs(mcfs.state)

const path = usePathStore()

const cursorOverride = computed(
  () => ({ cursor: path.isRoot ? 'default !important' : '' })
)
</script>

<style lang="css" scoped>
@import '../css/McfsEntryItem.css';
</style>
