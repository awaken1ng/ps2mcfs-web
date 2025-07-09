<template>
  <slot />
</template>

<script setup lang="ts">
import { provide } from 'vue'
import createModule from 'ps2mcfs-wasm/mcfs'
import { mcfsInjectionKey } from 'lib/mcfs/types'

const mcfs = await createModule()

provide(mcfsInjectionKey, mcfs)
</script>
