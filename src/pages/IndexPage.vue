<template>
  <Suspense>
    <IndexPageAsync/>

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

            <q-spinner
              v-else
              color="primary"
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
import IndexPageAsync from 'src/components/IndexPageAsync.vue'
import { onErrorCaptured, ref } from 'vue'

const error = ref<Error>()

onErrorCaptured((err) => {
  error.value = err
})
</script>
