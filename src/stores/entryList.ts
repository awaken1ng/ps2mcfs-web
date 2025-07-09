import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, readonly, ref } from 'vue'
import { useMcfs } from 'lib/mcfs'
import { usePathStore } from 'stores/path'
import { McEntryInfo } from 'ps2mcfs-wasm/mcfs'

const useStore = defineStore('entryList', () => {
  const entries = ref<McEntryInfo[]>([])

  const set = (v: McEntryInfo[]) => entries.value = v

  const selected = ref<Set<McEntryInfo>>(new Set())

  const selectedRo = readonly(selected)

  const isSelected = (entry: McEntryInfo) => selected.value.has(entry)

  const isSelectedAll = computed(() => selected.value.size === entries.value.length)

  const isSelectedNone = computed(() => !selected.value.size)

  const deselect = (entry: McEntryInfo) => selected.value.delete(entry)

  const select = (entry: McEntryInfo) => selected.value.add(entry)

  const toggleSelection = (entry: McEntryInfo) => {
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
    entryList.set(mcfs.readDirectory({ dirPath: path.current }) || [])
    entryList.deselectAll()
  }

  return Object.assign(
    entryList,
    {
      refresh,
    }
  )
}
