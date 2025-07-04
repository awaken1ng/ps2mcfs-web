<template>
  <q-toolbar class="justify-center">
    <!-- toolbar uses no-wrap, use an inner container that can be wrapped instead -->
    <!-- and split buttons further, so that when wrap happens, it nicely splits in half -->
    <div class="row wrap justify-center">
      <div class="row wrap justify-center">
        <McfsToolbarVmcNew />
        <McfsToolbarVmcOpen />
      </div>

      <div class="row wrap justify-center">
        <McfsToolbarVmcSave />
        <McfsToolbarVmcClose />
      </div>
    </div>
  </q-toolbar>

  <q-toolbar class="justify-center">
    <div class="row wrap justify-center">
      <McfsToolbarImportFiles />
      <McfsToolbarImportPsu />
      <McfsToolbarMkdir />
    </div>
  </q-toolbar>

  <q-toolbar class="toolbar-secondary">
    <McfsToolbarVmcFileName />

    <div class="row wrap justify-center">
      <McfsToolbarSelectionToggle />
    </div>
  </q-toolbar>
</template>

<script setup lang="ts">
import McfsToolbarVmcNew from 'components/McfsToolbarVmcNew.vue'
import McfsToolbarVmcOpen from 'components/McfsToolbarVmcOpen.vue'
import McfsToolbarVmcSave from 'components/McfsToolbarVmcSave.vue'
import McfsToolbarVmcClose from 'components/McfsToolbarVmcClose.vue'
import McfsToolbarImportFiles from 'components/McfsToolbarImportFiles.vue'
import McfsToolbarImportPsu from 'components/McfsToolbarImportPsu.vue'
import McfsToolbarMkdir from 'components/McfsToolbarMkdir.vue'
import McfsToolbarVmcFileName from 'components/McfsToolbarVmcFileName.vue'
import McfsToolbarSelectionToggle from 'components/McfsToolbarSelectionToggle.vue'
</script>

<style lang="css" scoped>
.q-toolbar {
  padding: 6px 12px;
}

.toolbar-primary {
  flex-wrap: wrap;
}

.toolbar-secondary {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 6px 12px;
  gap: 6px;
}

.toolbar-secondary .file-name {
  word-break: break-all;
}

@media (min-width: 500px) {
  .toolbar-secondary { flex-direction: row; }
}
</style>
