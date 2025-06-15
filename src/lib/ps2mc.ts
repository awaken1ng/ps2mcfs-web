import { formatBytes, joinPath, notifyError, notifyWarning } from './utils'
import { McDirEntry, type Module, sceMcFileAttrReadable, sceMcFileAttrWriteable,
  sceMcFileAttrExecutable, sceMcFileAttrDupProhibit, sceMcFileAttrFile,
  sceMcFileAttrSubdir, sceMcFileAttrPDAExec, sceMcFileAttrHidden, sceMcFileAttrPS1,
  McStDateTime, McFatCardSpecs, sceMcResSucceed,
  CF_USE_ECC, CF_BAD_BLOCK, CF_ERASE_ZEROES,
  sceMcFileCreateFile, sceMcResNotFile, sceMcResNoEntry,
} from './mcfs'

export type EntryType = 'directory' | 'file'
export type Entry = Omit<McDirEntry, 'hasMore'> & { type: EntryType }
type McInitResult = McFatCardSpecs & { availableSpace : number } | undefined

export const MAX_NAME_LENGTH = 31

export const isEntryReadable = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrReadable)
export const isEntryWriteable = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrWriteable)
export const isEntryExecutale = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrExecutable)
export const isEntryProtected = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrDupProhibit)
export const isEntryHidden = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrHidden)
export const isFileEntry = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrFile)
export const isDirectoryEntry = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrSubdir)
export const isPocketStationSave = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrPDAExec)
export const isPs1Save = (entry: Entry) => Boolean(entry.stat.mode & sceMcFileAttrPS1)

export const notifyMcfsError = (message: string, code: number) => notifyError({ message, caption: `Error code ${code}` })

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

export const getAvailableSpace = (mcfs: Module) => {
  const result = mcfs.getAvailableSpace()
  if ('code' in result) {
    notifyMcfsError('Failed to read available space', result.code)
    return
  }

  return result.availableSpace
}

export const newMemoryCardInMemory = (mcfs: Module): McInitResult => {
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
    notifyMcfsError('Failed to create memory card', code)
    return
  }

  const availableSpace = getAvailableSpace(mcfs)
  if (availableSpace === undefined)
      return


  return { availableSpace, ...cardSpecs }
}

export const openMemoryCardFromMemory = (mcfs: Module, mc: Uint8Array): McInitResult => {
  const cardSpecs = readCardSpecs(mc)

  if (!isEccImage(cardSpecs.cardSize))
    cardSpecs.cardFlags ^= CF_USE_ECC // remove ECC bit

  mcfs.setCardBuffer(mc)
  mcfs.setCardSpecs(cardSpecs)
  mcfs.setCardChanged(true)
  const code = mcfs.init()
  if (code !== sceMcResSucceed) {
    notifyMcfsError('Failed to open memory card', code)
    return
  }

  const availableSpace = getAvailableSpace(mcfs)
  if (availableSpace === undefined)
      return

  return { availableSpace, ...cardSpecs }
}

const readDirectoryFiltered = (mcfs: Module, dirName: string) => {
  const fd = mcfs.dopen(dirName)
  if (fd < 0) {
    notifyMcfsError(`Failed to open directory ${dirName}`, fd)
    return []
  }

  const files: Array<Entry> = []

  while (true) {
    const result = mcfs.dread(fd)
    if ('code' in result) {
      // don't return here, close the handle first
      notifyMcfsError(`Failed to read directory ${dirName}`, result.code)
      break
    }

    if (!result.hasMore)
      break

    const { name, stat } = result
    if (name === '.' || name === '..')
      continue

    const type = (stat.mode & sceMcFileAttrSubdir) ? 'directory' : 'file'
    files.push({ name, type, stat })
  }

  const code = mcfs.dclose(fd);
  if (code < 0) {
    notifyMcfsError(`Failed to close directory ${dirName}`, code)
  }

  return files
}

export const readDirectoryFilteredSorted = (mcfs: Module, dirName: string) => {
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

  return directories.concat(files)
}

export const createDirectory = (mcfs: Module, dirPath: string) => {
  const fd = mcfs.mkDir(dirPath)
  if (fd === sceMcResNoEntry) {
    notifyWarning({ message: `${dirPath} already exists` })
  } else if (fd !== sceMcResSucceed) {
    notifyMcfsError(`Failed to create ${dirPath} directory`, fd)
  }

  // fd doesn't appear to be actually opened? close returns -5
}

// TODO
// const createDirectoryRecursive = () => {}

const deleteDirectoryRecursive = (mcfs: Module, dirPath: string) => {
  const entries = readDirectoryFiltered(mcfs, dirPath)

  entries.forEach(entry => deleteEntry(mcfs, dirPath, entry))

  const code = mcfs.rmDir(dirPath)
  if (code !== sceMcResSucceed) {
    notifyMcfsError(`Failed to remove directory ${dirPath}`, code)
  }
}

export const deleteEntry = (mcfs: Module, root: string, entry: Entry) => {
  const fullPath = joinPath(root, entry.name)

  if (isFileEntry(entry)) {
    const code = mcfs.remove(fullPath)
    if (code !== sceMcResSucceed) {
      notifyMcfsError(`Failed to remove file ${fullPath}`, code)
    }
  } else if (isDirectoryEntry(entry)) {
    deleteDirectoryRecursive(mcfs, fullPath)
  }
}

export const readFileFromEntry = (mcfs: Module, root: string, entry: Entry) => {
  const filePath = joinPath(root, entry.name)
  const fd = mcfs.open(filePath, sceMcFileAttrFile | sceMcFileAttrReadable)
  if (fd < 0) {
    notifyMcfsError(`Failed to open file ${filePath} for reading`, fd)
    return
  }

  const result = mcfs.read(fd, entry.stat.size)
  const didReadFail = 'code' in result
  if (didReadFail) {
    notifyMcfsError(`Failed to read file ${filePath}`, result.code)
    // fallthrough to close the file
  }

  const code = mcfs.close(fd)
  if (code !== sceMcResSucceed) {
    notifyMcfsError(`Failed to close file ${filePath} after reading`, code)
  }

  if (!(didReadFail)) {
    return result.data
  }
}

export const writeFile = (mcfs: Module, filePath: string, fileData: Uint8Array) => {
  const fd = mcfs.open(filePath, sceMcFileAttrFile | sceMcFileCreateFile | sceMcFileAttrWriteable)
  if (fd < 0) {
    notifyMcfsError(`Failed to open file ${filePath} for writing`, fd)
    return
  }

  const written = mcfs.write(fd, fileData)
  if (written < 0) {
    notifyMcfsError(`Failed to write file ${filePath}`, written)
  } else if (written !== fileData.length) {
    notifyError({ message: `Incomplete write, written ${written} bytes out of ${fileData.length} in ${filePath}` })
  }
  // fallthrough to close the file

  const code = mcfs.close(fd)
  if (code !== sceMcResSucceed) {
    notifyMcfsError(`Failed to close file ${filePath} after writing`, code)
  }
}

export const copyFile = (mcfs: Module, fromRoot: string, fromEntry: Entry, toPath: string) => {
  const fileData = readFileFromEntry(mcfs, fromRoot, fromEntry)
  if (!fileData)
    return

  writeFile(mcfs, toPath, fileData)
}

export const moveFile = (mcfs: Module, fromRoot: string, fromEntry: Entry, toPath: string) => {
  copyFile(mcfs, fromRoot, fromEntry, toPath)
  deleteEntry(mcfs, fromRoot, fromEntry)
}

export const checkEntryExistence = (mcfs: Module, path: string) => {
  const fd = mcfs.open(path, 0)
  if (fd === sceMcResNotFile)
    return true // it's a directory
  if (fd === sceMcResNoEntry)
    return false
  if (fd < 0) {
    notifyMcfsError(`Failed to check existence of ${path}`, fd)
    return undefined
  }

  const code = mcfs.close(fd)
  if (code !== sceMcResSucceed) {
    notifyMcfsError(`Failed to close file ${path} after checking existence`, code)
  }

  return true // it's a file
}

export const renameEntry = (mcfs: Module, root: string, entry: Entry, newName: string) => {
  const newPath = joinPath(root, newName)
  if (checkEntryExistence(mcfs, newPath) !== false) {
    notifyError({ message: `Failed to rename, ${newName} already exists` })
    return
  }

  const filePath = joinPath(root, entry.name)
  const fd = mcfs.open(filePath, isFileEntry(entry) ? sceMcFileAttrFile : sceMcFileAttrSubdir)
  if (fd < 0) {
    notifyMcfsError(`Failed to open ${filePath} for renaming`, fd)
    return
  }

  let code = mcfs.setInfo(fd, entry.stat, newName, sceMcFileAttrFile)
  if (code !== sceMcResSucceed) {
    notifyMcfsError(`Failed to rename ${filePath}`, code)
  }

  code = mcfs.close(fd)
  if (code !== sceMcResSucceed) {
    notifyMcfsError(`Failed to close ${filePath} after renaming`, code)
  }
}


export const formatDateShort = (time: McStDateTime) => {
  const yyyy = time.year
  const mm = time.month.toString().padStart(2, '0')
  const dd = time.day.toString().padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export const formatDateLong = (time: McStDateTime) => {
  const hh = time.hour.toString().padStart(2, '0')
  const mm = time.min.toString().padStart(2, '0')
  const ss = time.sec.toString().padStart(2, '0')

  return `${formatDateShort(time)} ${hh}:${mm}:${ss}`
}

const itemsInDirectory = (entry: Entry) => {
  if (!isDirectoryEntry(entry))
    return `0 items`

  // each directory has `.` and `..` items, don't count them
  const itemsN = entry.stat.size - 2
  if (itemsN === 1)
    return `1 item`

  return `${itemsN} items`
}

export const formatEntrySize = (entry: Entry) =>
  isFileEntry(entry) ? formatBytes(entry.stat.size) : itemsInDirectory(entry)
