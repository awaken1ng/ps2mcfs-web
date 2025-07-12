import { type Module } from 'ps2mcfs-wasm/mcfs'
import { inject } from 'vue'
import { mcfsInjectionKey } from './types'
import { useMcfsStore } from 'stores/mcfs'
import {
  newCardInMemory,
  openCardFromMemory, type OpenCardFromMemoryOpts,
  saveCardToMemory, type SaveCardToMemoryOpts,
  closeCard,
} from './ops/card'
import {
  createDirectory, type CreateDirectoryOpts,
  openAndReadDirectoryFilteredGroupedSortedFlattenedAndUpdateState, type ReadDirectoryOpts,
  walkDirectory, type WalkDirectoryOpts,
} from './ops/directory'
import {
  readFileEntry, type ReadFileEntryOpts,
  writeFile, type WriteFileOpts,
} from './ops/file'
import {
  exportDirectoryAsPsu, type ExportPsuOpts,
  importDirectoryFromPsu, type ImportPsuOpts,
} from './ops/psu'
import { renameEntry, type RenameEntryOpts } from './ops/rename'
import { deleteEntry, type DeleteEntryOpts } from './ops/delete'

export const useMcfs = () => {
  const mcfs = inject<Module>(mcfsInjectionKey)
  if (!mcfs)
    throw new Error('mcfs was not provided')

  const state = useMcfsStore()

  return {
    newCardInMemory: () => newCardInMemory(mcfs, state),
    openCardFromMemory: (opts: OpenCardFromMemoryOpts) => openCardFromMemory(mcfs, state, opts),
    saveCardToMemory: (opts: SaveCardToMemoryOpts) => saveCardToMemory(mcfs, state, opts),
    closeCard: () => closeCard(state),
    createDirectory: (opts: CreateDirectoryOpts) => createDirectory(mcfs, state, opts),
    readDirectory: (opts: ReadDirectoryOpts) => openAndReadDirectoryFilteredGroupedSortedFlattenedAndUpdateState(mcfs, state, opts),
    walkDirectory: (opts: WalkDirectoryOpts) => walkDirectory(mcfs, opts),
    readFileEntry: (opts: ReadFileEntryOpts) => readFileEntry(mcfs, opts),
    writeFile: (opts: WriteFileOpts) => writeFile(mcfs, state, opts),
    importDirectoryFromPsu: (opts: ImportPsuOpts) => importDirectoryFromPsu(mcfs, state, opts),
    exportDirectoryAsPsu: (opts: ExportPsuOpts) => exportDirectoryAsPsu(mcfs, opts),
    renameEntry: (opts: RenameEntryOpts) => renameEntry(mcfs, state, opts),
    deleteEntry: (opts: DeleteEntryOpts) => deleteEntry(mcfs, state, opts),
    state,
  }
}
