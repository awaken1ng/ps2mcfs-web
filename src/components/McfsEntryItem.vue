<template>
  <q-item
    class="entry non-selectable"
    :clickable
    :v-ripple="clickable"
    @contextmenu.prevent="$emit('openMenu', entry)"
    :focused="entryList.isSelected(entry)"
    :active="entryList.isSelected(entry)"
    data-cy="entry"
  >
    <q-item-section
      avatar data-cy="entry-icon"
      @click.stop="$emit('toggleSelection', entry)"
    >
      <McfsEntryIcon :entry="entry" selection-icons />
    </q-item-section>

    <q-item-section @click="$emit('openDirectory', entry)">
      <q-item-label class="text-break" data-cy="entry-name">
        {{ entry.name }}
      </q-item-label>

      <q-item-label caption class="column">
        <div v-if="errorMessage" class="text-negative">
          {{ errorMessage }}
        </div>
        <div v-else class="row">
          <div class="text-no-wrap q-mr-sm">{{ entrySize }}</div>
          <McfsEntryAttributes class="text-no-wrap hide-on-desktop" :entry="entry"/>
        </div>

        <div class="row text-no-wrap hide-on-desktop ">
          <div class="q-mr-sm" :title="createdLong">Created: {{ createdShort }}</div>
          <div :title="modifiedLong">Modified: {{ modifiedShort }}</div>
        </div>
      </q-item-label>
    </q-item-section>

    <q-item-section side class="side attributes-and-date hide-on-mobile" @click="$emit('openDirectory', entry)">
      <q-item-label caption class="column items-end text-no-wrap">
        <McfsEntryAttributes :entry="entry"/>
        <div :title="createdLong">Created: {{ createdShort }}</div>
        <div :title="modifiedLong">Modified: {{ modifiedShort }}</div>
      </q-item-label>
    </q-item-section>

    <q-item-section v-if="menu" side class="side menu" @click.stop="$emit('openMenu', entry)" data-cy="entry-menu-open">
      <q-btn size="12px" flat dense round icon="sym_s_more_vert" />
    </q-item-section>
  </q-item>
</template>

<script lang="ts" setup>
import McfsEntryIcon from 'components/McfsEntryIcon.vue'
import McfsEntryAttributes from 'src/components/McfsEntryAttributes'
import { McEntryInfo, McStDateTime } from 'lib/mcfs'
import { isDirectoryEntry, isFileEntry } from 'lib/ps2mc'
import { formatBytes, pluralizeItems } from 'lib/utils'
import { useEntryListStore } from 'stores/entryList'
import { computed } from 'vue'

const props = defineProps<{
  readonly entry: McEntryInfo,
  clickable: boolean,
  menu: boolean,
  errorMessage?: string | undefined,
}>()

defineEmits<{
  (event: 'toggleSelection', entry: McEntryInfo): void
  (event: 'openDirectory', entry: McEntryInfo): void
  (event: 'openMenu', entry: McEntryInfo): void
}>()

const entryList = useEntryListStore()

const itemsInDirectory = (entry: McEntryInfo) => {
  const n = isDirectoryEntry(entry)
    ? entry.stat.size - 2 // each directory has `.` and `..` items, don't count them
    : 0;

  return pluralizeItems(n)
}

const formatDateShort = (time: McStDateTime) => {
  const yyyy = time.year
  const mm = time.month.toString().padStart(2, '0')
  const dd = time.day.toString().padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

const formatDateLong = (time: McStDateTime) => {
  const hh = time.hour.toString().padStart(2, '0')
  const mm = time.min.toString().padStart(2, '0')
  const ss = time.sec.toString().padStart(2, '0')

  return `${formatDateShort(time)} ${hh}:${mm}:${ss}`
}

const entrySize = computed(() =>
  isFileEntry(props.entry) ? formatBytes(props.entry.stat.size) : itemsInDirectory(props.entry)
)

const createdShort = computed(() => formatDateShort(props.entry.stat.ctime))
const modifiedShort = computed(() => formatDateShort(props.entry.stat.mtime))

const createdLong = computed(() => formatDateLong(props.entry.stat.ctime))
const modifiedLong = computed(() => formatDateLong(props.entry.stat.mtime))
</script>

<style lang="scss" scoped>
@import '../css/McfsEntryItem.css';

.date > .q-separator {
  display: none;
}

@media (min-width: 358px) {
  .date > .q-separator {
    display: flex;
  }
}
</style>
