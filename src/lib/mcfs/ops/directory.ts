import {
  McEntryInfo,
  type Module,
  sceMcResNoEntry,
  sceMcResSucceed,
} from "ps2mcfs-wasm/mcfs"
import { type State } from "../state"
import { notifyErrorWithCode, notifyWarning } from "../error"
import { getAvailableSpace } from "./card"
import { isFileEntry } from "../attributes"
import { joinPath } from "../utils"

export interface CreateDirectoryOpts {
  dirPath: string,
  existsOk: boolean,
}

export const createDirectory = (mcfs: Module, state: State, opts: CreateDirectoryOpts) => {
  const fd = mcfs.mkDir(opts.dirPath)
  if (fd === sceMcResNoEntry) {
    if (!opts.existsOk) notifyWarning({ message: `${opts.dirPath} already exists` })
  } else if (fd !== sceMcResSucceed) {
    notifyErrorWithCode(`Failed to create ${opts.dirPath} directory`, fd)
  }

  state.hasUnsavedChanges = true
  // fd doesn't appear to be actually opened, close returns -5 (denied)
}

export const readDirectoryFiltered = function* (mcfs: Module, fd: number) {
  while (true) {
    const result = mcfs.dread(fd)
    if ('code' in result) {
      notifyErrorWithCode(`Failed to read directory`, result.code)
      break
    }

    if (!result.hasMore)
      break

    const { name, stat } = result
    if (name === '.' || name === '..')
      continue

    yield { name, stat }
  }
}

const compareEntriesByName = (lhs: McEntryInfo, rhs: McEntryInfo) => {
  const lhsLower = lhs.name.toLowerCase()
  const rhsLower = rhs.name.toLowerCase()

  if (lhsLower > rhsLower) {
    return 1
  } else if (lhsLower < rhsLower) {
    return -1
  } else { // lhs === rhs
    return 0
  }
}

const openAndReadDirectoryFilteredGroupedSorted = (mcfs: Module, dirPath: string) => {
  const fd = mcfs.dopen(dirPath)
  if (fd < 0) {
    notifyErrorWithCode(`Failed to open directory ${dirPath}`, fd)
    return
  }

  const files: McEntryInfo[] = []
  const directories: McEntryInfo[] = []
  for (const item of readDirectoryFiltered(mcfs, fd)) {
    if (isFileEntry(item)) {
      files.push(item)
    } else {
      directories.push(item)
    }
  }

  files.sort(compareEntriesByName)
  directories.sort(compareEntriesByName)

  const code = mcfs.dclose(fd)
  if (code < 0) {
    notifyErrorWithCode(`Failed to close directory ${dirPath}`, code)
  }

  return { directories, files }
}

export interface ReadDirectoryOpts {
  dirPath: string,
}

export const openAndReadDirectoryFilteredGroupedSortedFlattenedAndUpdateState = (mcfs: Module, state: State, opts: ReadDirectoryOpts) => {
  const result = openAndReadDirectoryFilteredGroupedSorted(mcfs, opts.dirPath)
  if (!result)
    return

  state.availableSpace = getAvailableSpace(mcfs) || 0

  const { directories, files } = result
  return directories.concat(files)
}

export interface WalkDirectoryOpts {
  dirPath: string,
}

export interface WalkDirectoryReturn {
  root: string,
  directories: McEntryInfo[],
  files: McEntryInfo[],
}

export const walkDirectory = function* (mcfs: Module, opts: WalkDirectoryOpts): Generator<WalkDirectoryReturn> {
  const root = openAndReadDirectoryFilteredGroupedSorted(mcfs, opts.dirPath)
  if (!root)
    return

  yield { root: opts.dirPath, ...root }

  for (const directory of root.directories) {
    const dirPath = joinPath(opts.dirPath, directory.name)
    yield *walkDirectory(mcfs, { dirPath })
  }
}
