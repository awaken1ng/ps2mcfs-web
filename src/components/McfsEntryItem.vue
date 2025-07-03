<template>
  <q-item
    class="entry non-selectable"
    :clickable
    :v-ripple="clickable"
    @contextmenu.prevent="openMenu"
    :focused="entryList.isSelected(entry)"
    :active="entryList.isSelected(entry)"
    data-cy="entry"
  >
    <q-item-section
      avatar data-cy="entry-icon"
      @click.prevent="toggleSelection"
      @touchend.prevent="toggleSelection"
    >
      <McfsEntryIcon :entry="entry" selection-icons />
    </q-item-section>

    <q-item-section
      @click.prevent="openDirectory"
      @touchend.prevent="openDirectory"
    >
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

    <q-item-section
      side class="side attributes-and-date hide-on-mobile"
      @click.prevent="openDirectory"
      @touchend.prevent="openDirectory"
    >
      <q-item-label caption class="column items-end text-no-wrap">
        <McfsEntryAttributes :entry="entry"/>
        <div :title="createdLong">Created: {{ createdShort }}</div>
        <div :title="modifiedLong">Modified: {{ modifiedShort }}</div>
      </q-item-label>
    </q-item-section>

    <q-item-section
      v-if="menu" side class="side menu" data-cy="entry-menu-open"
      @click.prevent="openMenu"
      @touchend.prevent="openMenu"
    >
      <q-btn size="12px" flat dense round :icon="ICON_ENTRY_MENU" />
    </q-item-section>
  </q-item>
</template>

<script lang="ts" setup>
import McfsEntryIcon from 'components/McfsEntryIcon.vue'
import McfsEntryAttributes from 'components/McfsEntryAttributes'
import { McEntryInfo, McStDateTime } from 'ps2mcfs-wasm/mcfs'
import { isDirectoryEntry, isFileEntry } from 'lib/ps2mc'
import { formatBytes, pluralizeItems } from 'lib/utils'
import { useEntryListStore } from 'stores/entryList'
import { computed } from 'vue'
import { ICON_ENTRY_MENU } from 'lib/icon'

const props = defineProps<{
  readonly entry: McEntryInfo,
  clickable: boolean,
  menu: boolean,
  errorMessage?: string | undefined,
}>()

const emit = defineEmits<{
  (event: 'toggleSelection', entry: McEntryInfo): void
  (event: 'openDirectory', entry: McEntryInfo): void
  (event: 'openMenu', entry: McEntryInfo): void
}>()

const entryList = useEntryListStore()

const toggleSelection = () => emit('toggleSelection', props.entry)
const openDirectory = () => emit('openDirectory', props.entry)
const openMenu = () => emit('openMenu', props.entry)

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
