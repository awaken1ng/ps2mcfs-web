import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, readonly, ref } from 'vue'
import { useMcfs, type Entry  } from 'lib/ps2mc'
import { usePathStore } from 'stores/path'

const useStore = defineStore('entryList', () => {
  const entries = ref<Entry[]>([])

  const set = (v: Entry[]) => entries.value = v

  const selected = ref<Set<Entry>>(new Set())

  const selectedRo = readonly(selected)

  const isSelected = (entry: Entry) => selected.value.has(entry)

  const isSelectedAll = computed(() => selected.value.size === entries.value.length)

  const isSelectedNone = computed(() => !selected.value.size)

  const deselect = (entry: Entry) => selected.value.delete(entry)

  const select = (entry: Entry) => selected.value.add(entry)

  const toggleSelection = (entry: Entry) => {
    if (isSelected(entry)) {
      deselect(entry)
    } else {
      select(entry)
    }
  }

  const selectAll = () => entries.value.forEach(select)

  const deselectAll = () => selected.value.clear()

  const toggleSelectionAll = () => {
    if (isSelectedAll.value)
      deselectAll()
    else
      selectAll()
  }

  return {
    entries,
    set,
    selected: selectedRo,
    isSelected,
    isSelectedAll,
    isSelectedNone,
    deselect,
    toggleSelection,
    deselectAll,
    toggleSelectionAll,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useStore, import.meta.hot));
}

export const useEntryListStore = () => {
  const entryList = useStore()

  const mcfs = useMcfs()
  const path = usePathStore()

  const refresh = () => {
    entryList.set(mcfs.readDirectory(path.current))
    entryList.deselectAll()
  }

  return Object.assign(
    entryList,
    {
      refresh,
    }
  )
}
