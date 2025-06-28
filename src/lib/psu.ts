import { McEntry, McEntryInfo } from "ps2mcfs-wasm/mcfs"
import { isDirectoryEntry, isFileEntry, MAX_NAME_LENGTH } from "./ps2mc"
import { notifyError, notifyWarning } from "./utils"

const ENTRY_SIZE = 0x200

export interface Psu {
  directory: McEntryInfo,
  entries: McEntry[]
}

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

export const serializePsuEntry = (info: McEntryInfo) => {
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
    const charCode = info.name.charCodeAt(idx);
    view.setUint8(offset, charCode)
    offset += 1;
  }

  return array
}

export const deserializePsuEntry = (array: Uint8Array, offset: number): McEntryInfo => {
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

export const alignTo = (data: Uint8Array, align: number, fillValue: number) => {
  const paddingLength = align - (data.length % align)
  const alignedLength = data.length + paddingLength
  const aligned = new Uint8Array(alignedLength)
  aligned.set(data)

  for (let idx = data.length; idx < alignedLength; idx++) {
    aligned[idx] = fillValue
  }

  return aligned
}

export const readPsu = (psu: Uint8Array) => {
  const isValidSize = (psu.length % 512) === 0
  if (!isValidSize) {
    notifyError({ message: 'Invalid size, not a .psu file, or corrupted' })
    return
  }

  // root entry must be a directory entry
  let offset = 0;
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

    const paddingLength = 1024 - (file.stat.size % 1024)
    offset += file.stat.size + paddingLength
  }

  return parsed
}
