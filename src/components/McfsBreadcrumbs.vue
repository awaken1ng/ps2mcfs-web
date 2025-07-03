<template>
  <q-tabs
    v-model="path.current"
    :indicator-color="isLoaded ? undefined : 'transparent'"
    no-caps
    outside-arrows
    class="full-width"
    align="left"
    :breakpoint="0"
  >
    <div v-if="!isLoaded" class="breadcrumbs-skeleton" data-cy="breadcrumbs-skeleton">
      <q-skeleton animation="none" width="2rem" />
    </div>

    <q-tab v-else name="/" @click="path.goToRoot" :disable="path.isRoot" data-cy="breadcrumbs-root">
      <div class="q-tab__label row q-gutter-md">
        <span>/</span>
        <div v-if="!path.isRoot">
          <q-icon :name="ICON_BREADCRUMB_ARROW" />
        </div>
      </div>
    </q-tab>

    <template v-if="!path.isRoot">
      <q-tab
        v-for="fullComponent, idx in path.fullComponents"
        :key="fullComponent"
        :name="fullComponent"
        @click="path.goToLevel(idx)"
        :disable="fullComponent === path.current"
        :ripple="fullComponent === path.current"
        data-cy="breadcrumbs-crumb"
      >
        <div class="q-tab__label row no-wrap q-gutter-md">
          <span>{{ path.components[idx] }}</span>

          <div v-if="fullComponent !== path.current">
            <q-icon :name="ICON_BREADCRUMB_ARROW" />
          </div>
        </div>
      </q-tab>
    </template>
  </q-tabs>
</template>

<script setup lang="ts">
import { useMcfs } from 'lib/ps2mc'
import { usePathStore } from 'stores/path'
import { storeToRefs } from 'pinia'
import { ICON_BREADCRUMB_ARROW } from 'lib/icon'

const mcfs = useMcfs()
const { isLoaded } = storeToRefs(mcfs.state)

const path = usePathStore()
</script>

<style lang="css" scoped>
/* override line height in the tab labels so that the arrow icon is not as misaligned */
.q-tab__label { line-height: 1; }

.breadcrumbs-skeleton {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 12px;
  height: 48px;
}
</style>
