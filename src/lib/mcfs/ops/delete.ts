import { McEntryInfo, type Module, sceMcResSucceed } from "ps2mcfs-wasm/mcfs"
import { notifyErrorWithCode } from "../error"
import { readDirectoryFiltered } from "./directory"
import { joinPath } from "../utils"
import { isDirectoryEntry, isFileEntry } from "../attributes"
import { type State } from "../state"

interface DeleteDirectoryRecursiveOpts {
  dirPath: string
}

const deleteDirectoryRecursive = (mcfs: Module, state: State, opts: DeleteDirectoryRecursiveOpts) => {
  const fd = mcfs.dopen(opts.dirPath)
  if (fd < 0) {
    notifyErrorWithCode(`Failed to open directory ${opts.dirPath}`, fd)
    return
  }

  const entries = []
  for (const entry of readDirectoryFiltered(mcfs, fd)) {
    entries.push(entry)
  }

  let code = mcfs.dclose(fd)
  if (code < 0) {
    notifyErrorWithCode(`Failed to close directory ${opts.dirPath}`, code)
    return
  }

  entries.forEach(entry => deleteEntry(mcfs, state, { root: opts.dirPath, entry }))

  code = mcfs.rmDir(opts.dirPath)
  if (code !== sceMcResSucceed) {
    notifyErrorWithCode(`Failed to remove directory ${opts.dirPath}`, code)
  }
}

export interface DeleteEntryOpts {
  root: string,
  entry: McEntryInfo,
}

export const deleteEntry = (mcfs: Module, state: State, opts: DeleteEntryOpts) => {
  const fullPath = joinPath(opts.root, opts.entry.name)

  if (isFileEntry(opts.entry)) {
    const code = mcfs.remove(fullPath)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to remove file ${fullPath}`, code)
    }
  } else if (isDirectoryEntry(opts.entry)) {
    deleteDirectoryRecursive(mcfs, state, { dirPath: fullPath })
  }

  state.hasUnsavedChanges = true
}
