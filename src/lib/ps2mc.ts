import { inject } from 'vue'
import { joinPath, notifyError, notifyWarning } from './utils'
import { McDirEntry, type Module, sceMcFileAttrReadable, sceMcFileAttrWriteable,
  sceMcFileAttrExecutable, sceMcFileAttrDupProhibit, sceMcFileAttrFile,
  sceMcFileAttrSubdir, sceMcFileAttrPDAExec, sceMcFileAttrHidden, sceMcFileAttrPS1,
  McFatCardSpecs, sceMcResSucceed,
  CF_USE_ECC, CF_BAD_BLOCK, CF_ERASE_ZEROES,
  sceMcFileCreateFile, sceMcResNotFile, sceMcResNoEntry,
} from './mcfs'
import { useMcfsStore } from 'stores/mcfs'

export type Entry = Omit<McDirEntry, 'hasMore'>

export const MAX_NAME_LENGTH = 31

const ILLEGAL_NAME_CHARACTERS = [
  0x2A, // *
  0x2F, // /
  0x3F, // ?
]

export const notifyErrorWithCode = (message: string, code: number) => notifyError({ message, caption: `Error code ${code}` })

const readDirectoryFiltered = (mcfs: Module, dirName: string) => {
  const fd = mcfs.dopen(dirName)
  if (fd < 0) {
    notifyErrorWithCode(`Failed to open directory ${dirName}`, fd)
    return []
  }

  const files: Array<Entry> = []

  while (true) {
    const result = mcfs.dread(fd)
    if ('code' in result) {
      // don't return here, close the handle first
      notifyErrorWithCode(`Failed to read directory ${dirName}`, result.code)
      break
    }

    if (!result.hasMore)
      break

    const { name, stat } = result
    if (name === '.' || name === '..')
      continue

    files.push({ name, stat })
  }

  const code = mcfs.dclose(fd);
  if (code < 0) {
    notifyErrorWithCode(`Failed to close directory ${dirName}`, code)
  }

  return files
}

const checkEntryExistence = (mcfs: Module, path: string) => {
  const fd = mcfs.open(path, 0)
  if (fd === sceMcResNotFile)
    return true // it's a directory
  if (fd === sceMcResNoEntry)
    return false
  if (fd < 0) {
    notifyErrorWithCode(`Failed to check existence of ${path}`, fd)
    return undefined
  }

  const code = mcfs.close(fd)
  if (code !== sceMcResSucceed) {
    notifyErrorWithCode(`Failed to close file ${path} after checking existence`, code)
  }

  return true // it's a file
}

export const mcfsInjectionKey = Symbol()

export const useMcfs = () => {
  const mcfs = inject<Module>(mcfsInjectionKey)
  if (!mcfs)
    throw new Error('mcfs was not provided')

  const state = useMcfsStore()

  const newCardInMemory = (): boolean => {
    try {
      state.isLoading = true

      const cardSpecs = {
        pageSize: 512,
        blockSize: 16,
        cardSize: 8 * 1024 * 1024,
        cardFlags: CF_BAD_BLOCK | CF_ERASE_ZEROES,
      }

      mcfs.generateCardBuffer()
      mcfs.setCardSpecs(cardSpecs)
      mcfs.setCardChanged(true)

      const code = mcfs.init()
      if (code !== sceMcResSucceed) {
        notifyErrorWithCode('Failed to create memory card', code)
        return false
      }

      const cardFree = getAvailableSpace()
      if (cardFree === undefined)
          return false

      state.availableSpace = cardFree
      state.cardSize = cardSpecs.cardSize
      state.hasUnsavedChanges = false
      state.isLoaded = true
    } finally {
      state.isLoading = false
    }

    return true
  }

  const openCardFromMemory = (mc: Uint8Array): boolean => {
    try {
      state.isLoading = true

      const cardSpecs = readCardSpecs(mc)

      if (!isEccImage(cardSpecs.cardSize))
        cardSpecs.cardFlags ^= CF_USE_ECC // remove ECC bit

      mcfs.setCardBuffer(mc)
      mcfs.setCardSpecs(cardSpecs)
      mcfs.setCardChanged(true)
      const code = mcfs.init()
      if (code !== sceMcResSucceed) {
        notifyErrorWithCode('Failed to open memory card', code)
        return false
      }

      const cardFree = getAvailableSpace()
      if (cardFree === undefined)
          return false

      state.availableSpace = cardFree
      state.cardSize = cardSpecs.cardSize
      state.hasUnsavedChanges = false
      state.isLoaded = true
    } finally {
      state.isLoading = false
    }

    return true
  }

  const saveCardToMemory = () => {
    state.hasUnsavedChanges = false
    return mcfs.getCardBuffer()
  }

  const closeCard = () => {
    state.availableSpace = 0
    state.cardSize = 0
    state.isLoaded = false
    state.hasUnsavedChanges = false
  }

  const createDirectory = (dirPath: string) => {
    const fd = mcfs.mkDir(dirPath)
    if (fd === sceMcResNoEntry) {
      notifyWarning({ message: `${dirPath} already exists` })
    } else if (fd !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to create ${dirPath} directory`, fd)
    }

    state.hasUnsavedChanges = true
    // fd doesn't appear to be actually opened, close returns -5 (denied)
  }

  const readDirectoryFilteredSorted = (dirName: string) => {
    const items = readDirectoryFiltered(mcfs, dirName)

    const files: Entry[] = []
    const directories: Entry[] = []
    items.forEach(item => isFileEntry(item) ? files.push(item) : directories.push(item))

    const byName = (lhs: Entry, rhs: Entry) => {
      if (lhs.name > rhs.name) {
        return 1
      } else if (lhs.name < rhs.name) {
        return -1
      } else { // lhs.name === rhs.name
        return 0
      }
    }
    files.sort(byName)
    directories.sort(byName)

    state.availableSpace = getAvailableSpace() || 0

    return directories.concat(files)
  }

  const readFile = (root: string, entry: Entry) => {
    const filePath = joinPath(root, entry.name)
    const fd = mcfs.open(filePath, sceMcFileAttrFile | sceMcFileAttrReadable)
    if (fd < 0) {
      notifyErrorWithCode(`Failed to open file ${filePath} for reading`, fd)
      return
    }

    const result = mcfs.read(fd, entry.stat.size)
    const didReadFail = 'code' in result
    if (didReadFail) {
      notifyErrorWithCode(`Failed to read file ${filePath}`, result.code)
      // fallthrough to close the file
    }

    const code = mcfs.close(fd)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to close file ${filePath} after reading`, code)
    }

    if (!(didReadFail)) {
      return result.data
    }
  }

  // const copyFile = (fromRoot: string, fromEntry: Entry, toPath: string) => {
  //   const fileData = readFile(fromRoot, fromEntry)
  //   if (!fileData)
  //     return
  //
  //   writeFile(toPath, fileData)
  // }
  //
  // const moveFile = (fromRoot: string, fromEntry: Entry, toPath: string) => {
  //   copyFile(fromRoot, fromEntry, toPath)
  //   deleteEntry(fromRoot, fromEntry)
  // }

  const writeFile = (filePath: string, fileData: Uint8Array) => {
    const fd = mcfs.open(filePath, sceMcFileAttrFile | sceMcFileCreateFile | sceMcFileAttrWriteable)
    if (fd < 0) {
      notifyErrorWithCode(`Failed to open file ${filePath} for writing`, fd)
      return
    }

    const written = mcfs.write(fd, fileData)
    if (written < 0) {
      notifyErrorWithCode(`Failed to write file ${filePath}`, written)
    } else if (written !== fileData.length) {
      notifyError({ message: `Incomplete write, written ${written} bytes out of ${fileData.length} in ${filePath}` })
    }
    // fallthrough to close the file

    const code = mcfs.close(fd)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to close file ${filePath} after writing`, code)
    }

    state.hasUnsavedChanges = true
  }

  const renameEntry = (root: string, entry: Entry, newName: string) => {
    const newPath = joinPath(root, newName)
    if (checkEntryExistence(mcfs, newPath) !== false) {
      notifyError({ message: `Failed to rename, ${newName} already exists` })
      return
    }

    const filePath = joinPath(root, entry.name)
    const fd = mcfs.open(filePath, isFileEntry(entry) ? sceMcFileAttrFile : sceMcFileAttrSubdir)
    if (fd < 0) {
      notifyErrorWithCode(`Failed to open ${filePath} for renaming`, fd)
      return
    }

    let code = mcfs.setInfo(fd, entry.stat, newName, sceMcFileAttrFile)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to rename ${filePath}`, code)
    }

    code = mcfs.close(fd)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to close ${filePath} after renaming`, code)
    }

    state.hasUnsavedChanges = true
  }

  const deleteDirectoryRecursive = (dirPath: string) => {
    const entries = readDirectoryFiltered(mcfs, dirPath)

    entries.forEach(entry => deleteEntry(dirPath, entry))

    const code = mcfs.rmDir(dirPath)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to remove directory ${dirPath}`, code)
    }
  }

  const deleteEntry = (root: string, entry: Entry) => {
    const fullPath = joinPath(root, entry.name)

    if (isFileEntry(entry)) {
      const code = mcfs.remove(fullPath)
      if (code !== sceMcResSucceed) {
        notifyErrorWithCode(`Failed to remove file ${fullPath}`, code)
      }
    } else if (isDirectoryEntry(entry)) {
      deleteDirectoryRecursive(fullPath)
    }

    state.hasUnsavedChanges = true
  }

  const getAvailableSpace = () => {
    const result = mcfs.getAvailableSpace()
    if ('code' in result) {
      notifyErrorWithCode('Failed to read available space', result.code)
      return
    }

    return result.availableSpace
  }

  return {
    newCardInMemory,
    openCardFromMemory,
    saveCardToMemory,
    closeCard,
    createDirectory,
    readDirectory: readDirectoryFilteredSorted,
    readFile,
    writeFile,
    renameEntry,
    deleteEntry,
    state,
  }
}

export const isEntryReadable = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrReadable)
export const isEntryWriteable = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrWriteable)
export const isEntryExecutale = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrExecutable)
export const isEntryProtected = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrDupProhibit)
export const isEntryHidden = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrHidden)
export const isFileEntry = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrFile)
export const isDirectoryEntry = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrSubdir)
export const isPocketStationSave = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrPDAExec)
export const isPs1Save = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrPS1)

export const isNonEccImage = (cardSize: number) => cardSize % 1024 === 0
export const isEccImage = (cardSize: number) => cardSize % 1056 === 0

export const readCardSpecs = (array: Uint8Array): McFatCardSpecs => {
  const pageSize = array[40]! | (array[41]! << 8)
  const pagesPerCluster = array[42]! | (array[43]! << 8)
  const blockSize = array[44]! | (array[45]! << 8)
  const clustersPerCard = array[48]! | (array[49]! << 8) | (array[50]! << 16) | (array[51]! << 24)
  const cardFlags = array[337]!;
  const cardSize = clustersPerCard * pagesPerCluster * pageSize

  return { pageSize, blockSize, cardSize, cardFlags }
}

export const isEntryNameLegal = (name: string) => {
  if (!name)
    return 'Name is empty'

  if (name.length > MAX_NAME_LENGTH)
    return 'Name too long'

  if (name === '.' || name === '..')
    return 'Name is reserved'

  const hasLeadingSpaces = name.startsWith(' ')
  const hasTrailingSpaces = name.endsWith(' ')
  if (hasLeadingSpaces && hasTrailingSpaces) {
    const isAllSpaces = name.match(/\s/g)?.length === name.length
    if (isAllSpaces)
      return 'Name is all spaces'
    else
      return 'Name has leading and trailing spaces'
  } else if (hasLeadingSpaces)
    return 'Name has leading spaces'
  else if (hasTrailingSpaces)
    return 'Name has trailing spaces'

  for (let idx = 0; idx < name.length; idx++) {
    const charCode = name.charCodeAt(idx)

    const isAscii = charCode <= 0x7F
    if (!isAscii)
      return 'Name contains non-ASCII characters'

    const isControl = (charCode >= 0x00 && charCode <= 0x1F) || (charCode === 0x7F)
    if (isControl)
      return 'Name contains control characters'

    const isIllegal = ILLEGAL_NAME_CHARACTERS.includes(charCode)
    if (isIllegal)
      return `Name contains illegal characters (${String.fromCodePoint(...ILLEGAL_NAME_CHARACTERS)})`
  }

  return true
}
