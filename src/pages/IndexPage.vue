<template>
  <Suspense>
    <McfsProviderAsync>
      <q-page-container>
        <q-page class="column items-center">
          <McfsToolbar/>
          <McfsBreadcrumbs />
          <McfsEntryList />
        </q-page>
      </q-page-container>
    </McfsProviderAsync>

    <template #fallback>
      <q-page-container>
        <q-page class="column">
          <div class="q-mx-auto q-my-auto">
            <div v-if="error" class="q-ma-lg">
              <div class="text-subtitle1">Initialization failed</div>
              <div class="text-subtitle2">{{ error.name }}</div>
              <div class="text-subtitle2">{{ error.message }}</div>
              <pre class="text-caption">{{ error.stack }}</pre>
            </div>

            <q-spinner-orbit
              v-else
              size="4em"
              :thickness="2"
            />
          </div>
        </q-page>
      </q-page-container>
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import McfsProviderAsync from 'components/McfsProviderAsync.vue'
import McfsToolbar from 'components/McfsToolbar.vue'
import McfsBreadcrumbs from 'components/McfsBreadcrumbs.vue'
import McfsEntryList from 'components/McfsEntryList.vue'
import { useMcfsStore } from 'stores/mcfs'
import { storeToRefs } from 'pinia'
import { onBeforeUnload } from 'lib/utils'
import { onErrorCaptured, ref, watchEffect } from 'vue'
import { usePathStore } from 'stores/path'

const error = ref<Error>()

const path = usePathStore()
const mcfsState = useMcfsStore()
const { hasUnsavedChanges } = storeToRefs(mcfsState)

onBeforeUnload((event) => {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
    event.returnValue = true
  }
})

onErrorCaptured((err) => {
  error.value = err
})

watchEffect(() => {
  if (!mcfsState.isLoaded && !path.isRoot)
    path.goToRoot()
})
</script>

<style lang="css" scoped>
.q-page {
  margin: auto;
  max-width: 600px;
}
</style>
