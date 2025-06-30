import { inject } from 'vue'
import { joinPath, notifyError, notifyWarning } from './utils'
import { McEntryInfo, type Module, sceMcFileAttrReadable, sceMcFileAttrWriteable,
  sceMcFileAttrExecutable, sceMcFileAttrDupProhibit, sceMcFileAttrFile,
  sceMcFileAttrSubdir, sceMcFileAttrPDAExec, sceMcFileAttrHidden, sceMcFileAttrPS1,
  McFatSetCardSpecs, sceMcResSucceed,
  CF_USE_ECC,
  sceMcFileCreateFile, sceMcResNotFile, sceMcResNoEntry,
  McStDateTime,
  mcFileUpdateAttrMode,
  mcFileUpdateAttrCtime,
  mcFileUpdateAttrMtime,
  McIoStat,
  sceMcFile0400,
  sceMcFileAttrExists,
} from 'ps2mcfs-wasm/mcfs'
import { useMcfsStore } from 'stores/mcfs'
import { alignTo, Psu, serializePsuEntry } from './psu'

export const MAX_NAME_LENGTH = 31

const ILLEGAL_NAME_CHARACTERS = [
  0x2A, // *
  0x2F, // /
  0x3F, // ?
]

export const notifyErrorWithCode = (message: string, code: number) => notifyError({ message, caption: `Error code ${code}` })

export const readDirectoryFiltered = function* (mcfs: Module, fd: number) {
  while (true) {
    const result = mcfs.dread(fd)
    if ('code' in result) {
      // don't return here, close the handle first
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

const EMPTY_DATE: McStDateTime = {
  resv2: 0,
  sec: 0,
  min: 0,
  hour: 0,
  day: 0,
  month: 0,
  year: 0
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

      const info = mcfs.generateCardBuffer()
      const cardSpecs = readCardSpecs(info.superblock)
      if (!info.isEccImage)
        cardSpecs.cardFlags ^= CF_USE_ECC // remove ECC bit

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
      state.cardSize = cardSpecs.cardPages * cardSpecs.pageSize
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
      state.isLoaded = false

      const cardSpecs = readCardSpecs(mc)

      if (!isEccImage(mc.length))
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
      state.cardSize = cardSpecs.cardPages * cardSpecs.pageSize
      state.hasUnsavedChanges = false
      state.isLoaded = true
    } finally {
      state.isLoading = false
    }

    return true
  }

  const saveCardToMemory = (opts: {
    withEcc: boolean,
    onProgress?: (bytesWritten: number, bytesToWrite: number) => void,
  }) => {
    state.hasUnsavedChanges = false

    const specs = mcfs.getCardSpecs()
    if ('code' in specs) {
      notifyErrorWithCode(`Failed to get card specs`, specs.code)
      return
    }

    let cardSizeWithMaybeEcc = specs.cardSize
    let pageSizeWithMaybeEcc = specs.pageSize
    if (opts.withEcc) {
      cardSizeWithMaybeEcc += cardSizeWithMaybeEcc >> 5
      pageSizeWithMaybeEcc += pageSizeWithMaybeEcc >> 5
    }

    const cardPages = specs.cardSize / specs.pageSize
    const buffer = new Uint8Array(cardSizeWithMaybeEcc)
    for (let pageIdx = 0; pageIdx < cardPages; pageIdx++) {
      const page = mcfs.readPage(pageIdx, opts.withEcc)
      if ('code' in page) {
        notifyErrorWithCode(`Failed to read card page ${pageIdx}`, page.code)
        return
      }

      const pageOffset = pageSizeWithMaybeEcc * pageIdx
      buffer.set(page.data, pageOffset)


      if ('ecc' in page) {
        const eccOffset = pageOffset + specs.pageSize
        buffer.set(page.ecc, eccOffset)
      }

      opts.onProgress?.(pageIdx * pageSizeWithMaybeEcc, cardSizeWithMaybeEcc)
    }

    return buffer
  }

  const closeCard = () => {
    state.availableSpace = 0
    state.cardSize = 0
    state.isLoaded = false
    state.hasUnsavedChanges = false
  }

  const createDirectory = (opts: { path: string, existsOk: boolean }) => {
    const fd = mcfs.mkDir(opts.path)
    if (fd === sceMcResNoEntry) {
      if (!opts.existsOk) notifyWarning({ message: `${opts.path} already exists` })
    } else if (fd !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to create ${opts.path} directory`, fd)
    }

    state.hasUnsavedChanges = true
    // fd doesn't appear to be actually opened, close returns -5 (denied)
  }

  const readDirectoryFilteredSorted = (dirName: string) => {
    const fd = mcfs.dopen(dirName)
    if (fd < 0) {
      notifyErrorWithCode(`Failed to open directory ${dirName}`, fd)
      return []
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

    const code = mcfs.dclose(fd);
    if (code < 0) {
      notifyErrorWithCode(`Failed to close directory ${dirName}`, code)
    }

    const byName = (lhs: McEntryInfo, rhs: McEntryInfo) => {
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
    files.sort(byName)
    directories.sort(byName)

    state.availableSpace = getAvailableSpace() || 0

    return directories.concat(files)
  }

  const readFile = (root: string, entry: McEntryInfo) => {
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

  // const copyFile = (fromRoot: string, fromEntry: McEntryInfo, toPath: string) => {
  //   const fileData = readFile(fromRoot, fromEntry)
  //   if (!fileData)
  //     return
  //
  //   writeFile({ path: toPath, data: fileData })
  // }
  //
  // const moveFile = (fromRoot: string, fromEntry: McEntryInfo, toPath: string) => {
  //   copyFile(fromRoot, fromEntry, toPath)
  //   deleteEntry(fromRoot, fromEntry)
  // }

  const writeFile = (opts: { path: string, data: Uint8Array }) => {
    const fd = mcfs.open(opts.path, sceMcFileAttrFile | sceMcFileCreateFile | sceMcFileAttrWriteable)
    if (fd < 0) {
      notifyErrorWithCode(`Failed to open file ${opts.path} for writing`, fd)
      return
    }

    const written = mcfs.write(fd, opts.data)
    if (written < 0) {
      notifyErrorWithCode(`Failed to write file ${opts.path}`, written)
      // fallthrough to close the file
    } else if (written !== opts.data.length) {
      notifyError({ message: `Incomplete write, written ${written} bytes out of ${opts.data.length} in ${opts.path}` })
      // fallthrough to close the file
    }

    const code = mcfs.close(fd)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to close file ${opts.path} after writing`, code)
    }

    state.hasUnsavedChanges = true
  }

  const setAttributes = (opts: {
    path: string,
    attributes?: number,
    created?: McStDateTime,
    modified?: McStDateTime,
  }) => {
    let flags= 0;
    if (opts.attributes !== undefined)
      flags |= mcFileUpdateAttrMode
    if (opts.created)
      flags |= mcFileUpdateAttrCtime
    if (opts.modified)
      flags |= mcFileUpdateAttrMtime

    if (flags) {
      const info: McIoStat = {
        mode: opts.attributes || 0,
        attr: 0,
        size: 0,
        ctime: opts.created || EMPTY_DATE,
        mtime: opts.modified || EMPTY_DATE,
      }

      const code = mcfs.setInfo(opts.path, info, '', flags);
      if (code !== sceMcResSucceed) {
        notifyErrorWithCode(`Failed to set attributes for ${opts.path}`, code)
      }
    }
  }

  const importDirectoryFromPsu = (opts: { psu: Psu, overwrite: boolean }) => {
    const dirPath = joinPath('/', opts.psu.directory.name)
    const dirExists = checkEntryExistence(mcfs, dirPath)
    createDirectory({ path: dirPath, existsOk: true })

    for (const entry of opts.psu.entries) {
      const filePath = joinPath(dirPath, entry.name)
      const exists = checkEntryExistence(mcfs, filePath)
      if (exists === undefined)
        return

      if (exists) {
        if (!opts.overwrite)
          continue

        const code = mcfs.remove(filePath)
        if (code !== sceMcResSucceed) {
          notifyErrorWithCode(`Failed to remove file ${filePath}`, code)
        }
      }

      writeFile({
        path: filePath,
        data: entry.contents,
      })

      setAttributes({
        path: filePath,
        attributes: entry.stat.mode,
        created: entry.stat.ctime,
        modified: entry.stat.mtime,
      })
    }

    if (!dirExists || (dirExists && opts.overwrite)) {
      setAttributes({
        path: dirPath,
        attributes: opts.psu.directory.stat.mode,
        created: opts.psu.directory.stat.ctime,
        modified: opts.psu.directory.stat.mtime,
      })
    }
  }

  const exportDirectoryAsPsu = (opts: { path: string }) => {
    const dirFd = mcfs.open(opts.path, sceMcFileAttrSubdir)
    if (dirFd < 0) {
      notifyErrorWithCode(`Failed to open ${opts.path} for PSU export`, dirFd)
      return
    }

    const dirInfo = mcfs.stat(dirFd)
    if ('code' in dirInfo) {
      notifyErrorWithCode(`Failed to get ${opts.path} information for PSU export`, dirFd)
      return
    }

    const entries: { entry: Uint8Array, data?: Uint8Array }[] = [
      {
        entry: serializePsuEntry({
          stat: {
            mode: sceMcFileAttrReadable | sceMcFileAttrWriteable | sceMcFileAttrExecutable | sceMcFileAttrSubdir | sceMcFile0400 | sceMcFileAttrExists,
            size: 0,
            ctime: dirInfo.stat.ctime,
            mtime: dirInfo.stat.mtime,
            attr: 0,
          },
          name: '.',
        })
      },
      {
        entry: serializePsuEntry({
          stat: {
            mode: sceMcFileAttrReadable | sceMcFileAttrWriteable | sceMcFileAttrExecutable | sceMcFileAttrSubdir | sceMcFile0400 | sceMcFileAttrExists,
            size: 0,
            ctime: dirInfo.stat.ctime,
            mtime: dirInfo.stat.mtime,
            attr: 0,
          },
          name: '..',
        })
      },
    ]

    for (const item of readDirectoryFiltered(mcfs, dirFd)) {
      const filePath = joinPath(opts.path, item.name)
      const fileFd = mcfs.open(filePath, sceMcFileAttrFile | sceMcFileAttrReadable)
      if (fileFd < 0) {
        notifyErrorWithCode(`Failed to open file ${filePath} while exporting`, fileFd)
        mcfs.close(fileFd)
        mcfs.close(dirFd)
        return
      }

      // dread does not return all attributes
      const info = mcfs.stat(fileFd)
      if ('code' in info) {
        notifyErrorWithCode(`Failed to get file information for ${filePath}`, info.code)
        return
      }

      const resultData = mcfs.read(fileFd, item.stat.size)
      if ('code' in resultData) {
        // don't return here, close the handle first
        mcfs.close(fileFd)
        mcfs.close(dirFd)
        notifyErrorWithCode(`Failed to read file ${filePath}`, resultData.code)
        return
      }

      const aligned = alignTo(resultData.data, 1024, 0xFF)

      const code = mcfs.close(fileFd)
      if (code !== sceMcResSucceed) {
        notifyErrorWithCode(`Failed to close file ${opts.path} while exporting`, code)
        mcfs.close(fileFd)
        return
      }

      const entry = serializePsuEntry(info)
      entries.push({ entry, data: aligned })
    }

    const code = mcfs.close(dirFd)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to close directory ${opts.path} after exporting`, code)
      return
    }

    const dirEntry = serializePsuEntry({
      stat: {
        mode: dirInfo.stat.mode,
        attr: 0,
        size: entries.length,
        ctime: dirInfo.stat.ctime,
        mtime: dirInfo.stat.mtime,
      },
      name: dirInfo.name
    })

    // concat everything into a single buffer
    const totalSize = dirEntry.length + entries.reduce((acc, { entry, data }) => acc + entry.length + (data?.length || 0), 0)
    const psu = new Uint8Array(totalSize)
    psu.set(dirEntry)

    let ptr = dirEntry.length
    entries.forEach(({ entry, data }) => {
      psu.set(entry, ptr)
      ptr += entry.length

      if (data) {
        psu.set(data, ptr)
        ptr += data.length
      }
    })

    return psu
  }

  const renameEntry = (root: string, entry: McEntryInfo, newName: string) => {
    const newPath = joinPath(root, newName)
    if (checkEntryExistence(mcfs, newPath) !== false) {
      notifyError({ message: `Failed to rename, ${newName} already exists` })
      return
    }

    const filePath = joinPath(root, entry.name)
    const code = mcfs.setInfo(filePath, entry.stat, newName, sceMcFileAttrFile)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to rename ${filePath}`, code)
    }

    state.hasUnsavedChanges = true
  }

  const deleteDirectoryRecursive = (dirPath: string) => {
    const fd = mcfs.dopen(dirPath)
    if (fd < 0) {
      notifyErrorWithCode(`Failed to open directory ${dirPath}`, fd)
      return
    }

    const entries = []
    for (const entry of readDirectoryFiltered(mcfs, fd)) {
      entries.push(entry)
    }

    let code = mcfs.dclose(fd);
    if (code < 0) {
      notifyErrorWithCode(`Failed to close directory ${dirPath}`, code)
      return
    }

    entries.forEach(entry => deleteEntry(dirPath, entry))

    code = mcfs.rmDir(dirPath)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to remove directory ${dirPath}`, code)
    }
  }

  const deleteEntry = (root: string, entry: McEntryInfo) => {
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
    importDirectoryFromPsu,
    exportDirectoryAsPsu,
    renameEntry,
    deleteEntry,
    state,
  }
}

export const isEntryReadable = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrReadable)
export const isEntryWriteable = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrWriteable)
export const isEntryExecutale = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrExecutable)
export const isEntryProtected = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrDupProhibit)
export const isEntryHidden = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrHidden)
export const isFileEntry = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrFile)
export const isDirectoryEntry = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrSubdir)
export const isPocketStationSave = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrPDAExec)
export const isPs1Save = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrPS1)

export const isNonEccImage = (cardSize: number) => cardSize % 1024 === 0
export const isEccImage = (cardSize: number) => cardSize % 1056 === 0

export const readCardSpecs = (array: Uint8Array): McFatSetCardSpecs => {
  const view = new DataView(array.buffer)

  const pageSize = view.getUint16(40, true)
  const pagesPerCluster =  view.getUint16(42, true)
  const blockSize = view.getUint16(44, true)
  const clustersPerCard = view.getUint32(48, true)
  const cardFlags = view.getUint8(337)
  const cardPages = clustersPerCard * pagesPerCluster

  return { pageSize, blockSize, cardPages, cardFlags }
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
