import {
  type Module,
  sceMcFileAttrReadable,
  sceMcFileAttrWriteable,
  sceMcFileAttrExecutable,
  sceMcFileAttrSubdir,
  sceMcFile0400,
  sceMcFileAttrExists,
  sceMcFileAttrFile,
  sceMcResSucceed,
  McEntryInfo,
  McEntry,
} from "ps2mcfs-wasm/mcfs"
import { notifyErrorWithCode, notifyError, notifyWarning } from "../error"
import { joinPath, MAX_NAME_LENGTH } from "../utils"
import { checkEntryExistence } from "./exists"
import { createDirectory, readDirectoryFiltered } from "./directory"
import { type State } from "../state"
import { writeFile } from "./file"
import { setAttributes } from "./attributes"
import { isDirectoryEntry, isFileEntry } from "../attributes"

export interface Psu {
  directory: McEntryInfo,
  entries: McEntry[]
}

const ENTRY_SIZE = 0x200

const readCString = (view: DataView, ptr: number, maxLength: number) => {
  const charCodes = []

  for (let idx = ptr; idx < ptr + maxLength; idx++) {
    const charCode = view.getUint8(idx)
    if (charCode === 0)
      break

    charCodes.push(charCode)
  }

  return String.fromCharCode(...charCodes)
}

const deserializePsuEntry = (array: Uint8Array, offset: number): McEntryInfo => {
  const view = new DataView(array.buffer)

  return {
    stat: {
      mode: view.getUint16(offset + 0x000, true),
      attr: 0,
      size: view.getUint32(offset + 0x004, true),
      ctime: {
        resv2: view.getUint8(offset + 0x008),
        sec: view.getUint8(offset + 0x009),
        min: view.getUint8(offset + 0x00A),
        hour: view.getUint8(offset + 0x00B),
        day: view.getUint8(offset + 0x00C),
        month: view.getUint8(offset + 0x00D),
        year: view.getUint16(offset + 0x00E, true),
      },
      mtime: {
        resv2: view.getUint8(offset + 0x018),
        sec: view.getUint8(offset + 0x019),
        min: view.getUint8(offset + 0x01A),
        hour: view.getUint8(offset + 0x01B),
        day: view.getUint8(offset + 0x01C),
        month: view.getUint8(offset + 0x01D),
        year: view.getUint16(offset + 0x01E, true),
      },
    },
    name: readCString(view, offset + 0x040, MAX_NAME_LENGTH)
  }
}

const calculatePadding = (size: number, align: number) => {
  if ((size % align) === 0)
    return 0

  return align - (size % align)
}

export const readPsu = (psu: Uint8Array) => {
  const isValidSize = (psu.length % 512) === 0
  if (!isValidSize) {
    notifyError({ message: 'Invalid size, not a .psu file, or corrupted' })
    return
  }

  // root entry must be a directory entry
  let offset = 0
  const dir = deserializePsuEntry(psu, offset)
  offset += ENTRY_SIZE
  if (!isDirectoryEntry(dir)) {
    notifyError({ message: 'Invalid .psu file, root entry is not a directory' })
    return
  }

  if (dir.stat.size < 3) {
    notifyWarning({ message: `.psu is empty` })
    return
  }

  // must contain `.` and `..` entries
  let entry = deserializePsuEntry(psu, offset)
  offset += ENTRY_SIZE
  if (entry.name !== '.') {
    notifyError({ message: 'Invalid .psu file, first entry is not a .' })
    return
  }

  entry = deserializePsuEntry(psu, offset)
  offset += ENTRY_SIZE
  if (entry.name !== '..') {
    notifyError({ message: 'Invalid .psu file, second entry is not a ..' })
    return
  }

  const parsed: Psu = {
    directory: dir,
    entries: []
  }

  for (let idx = 0; idx < dir.stat.size - 2; idx++) {
    const file = deserializePsuEntry(psu, offset)
    offset += ENTRY_SIZE

    // sub directory must only contain files
    if (!isFileEntry(file)) {
      notifyWarning({ message: `Invalid .psu file, entry at index ${idx} is not a file` })
      return
    }

    const contents = psu.slice(offset, offset + file.stat.size)
    parsed.entries.push({ ...file, contents })

    const paddingLength = calculatePadding(file.stat.size, 1024)
    offset += file.stat.size + paddingLength
  }

  return parsed
}

export interface ImportPsuOpts {
  psu: Psu,
  overwrite: boolean,
}

export const importDirectoryFromPsu = (mcfs: Module, state: State, opts: ImportPsuOpts) => {
  const dirPath = joinPath('/', opts.psu.directory.name)
  const dirExists = checkEntryExistence(mcfs, dirPath)
  createDirectory(mcfs, state, { dirPath, existsOk: true })

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

    const written = writeFile(mcfs, state, {
      path: filePath,
      data: entry.contents,
    })
    if (!written)
      return

    setAttributes(mcfs, state, {
      path: filePath,
      attributes: entry.stat.mode,
      created: entry.stat.ctime,
      modified: entry.stat.mtime,
    })
  }

  if (!dirExists || (dirExists && opts.overwrite)) {
    setAttributes(mcfs, state, {
      path: dirPath,
      attributes: opts.psu.directory.stat.mode,
      created: opts.psu.directory.stat.ctime,
      modified: opts.psu.directory.stat.mtime,
    })
  }
}

const alignTo = (data: Uint8Array, align: number, fillValue: number) => {
  const paddingLength = calculatePadding(data.length, align)
  const alignedLength = data.length + paddingLength
  const aligned = new Uint8Array(alignedLength)
  aligned.set(data)

  for (let idx = data.length; idx < alignedLength; idx++) {
    aligned[idx] = fillValue
  }

  return aligned
}

const serializePsuEntry = (info: McEntryInfo) => {
  const array = new Uint8Array(ENTRY_SIZE)
  const view = new DataView(array.buffer)

  view.setUint16(0x000, info.stat.mode, true)
  view.setUint32(0x004, info.stat.size, true)
  view.setUint8(0x008, info.stat.ctime.resv2)
  view.setUint8(0x009, info.stat.ctime.sec)
  view.setUint8(0x00A, info.stat.ctime.min)
  view.setUint8(0x00B, info.stat.ctime.hour)
  view.setUint8(0x00C, info.stat.ctime.day)
  view.setUint8(0x00D, info.stat.ctime.month)
  view.setUint16(0x00E, info.stat.ctime.year, true)
  view.setUint8(0x018, info.stat.mtime.resv2)
  view.setUint8(0x019, info.stat.mtime.sec)
  view.setUint8(0x01A, info.stat.mtime.min)
  view.setUint8(0x01B, info.stat.mtime.hour)
  view.setUint8(0x01C, info.stat.mtime.day)
  view.setUint8(0x01D, info.stat.mtime.month)
  view.setUint16(0x01E, info.stat.mtime.year, true)

  let offset = 0x040
  for (let idx = 0; idx < Math.min(info.name.length, MAX_NAME_LENGTH); idx++) {
    const charCode = info.name.charCodeAt(idx)
    view.setUint8(offset, charCode)
    offset += 1
  }

  return array
}

export interface ExportPsuOpts {
  dirPath: string,
}

export const exportDirectoryAsPsu = (mcfs: Module, opts: ExportPsuOpts) => {
  const dirFd = mcfs.open(opts.dirPath, sceMcFileAttrSubdir)
  if (dirFd < 0) {
    notifyErrorWithCode(`Failed to open ${opts.dirPath} for PSU export`, dirFd)
    return
  }

  const dirInfo = mcfs.stat(dirFd)
  if ('code' in dirInfo) {
    notifyErrorWithCode(`Failed to get ${opts.dirPath} information for PSU export`, dirFd)
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
    const filePath = joinPath(opts.dirPath, item.name)
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
      notifyErrorWithCode(`Failed to close file ${opts.dirPath} while exporting`, code)
      mcfs.close(fileFd)
      return
    }

    const entry = serializePsuEntry(info)
    entries.push({ entry, data: aligned })
  }

  const code = mcfs.close(dirFd)
  if (code !== sceMcResSucceed) {
    notifyErrorWithCode(`Failed to close directory ${opts.dirPath} after exporting`, code)
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
