import { McEntry, McEntryInfo } from "./mcfs"
import { isDirectoryEntry, isFileEntry, MAX_NAME_LENGTH } from "./ps2mc"
import { notifyError, notifyWarning } from "./utils"

const ENTRY_SIZE = 0x200

export interface Psu {
  directory: McEntryInfo,
  entries: McEntry[]
}

const writeU8 = (buffer: Uint8ClampedArray, ptr: number, value: number) => {
  buffer[ptr] = value
  return ptr + 1
}

const writeU16LE = (buffer: Uint8ClampedArray, ptr: number, value: number) => {
  buffer[ptr] = value
  buffer[ptr] = value >> 8
  return ptr + 2
}

const writeU32LE = (buffer: Uint8ClampedArray, ptr: number, value: number) => {
  buffer[ptr] = value
  buffer[ptr] = value >> 8
  buffer[ptr] = value >> 16
  buffer[ptr] = value >> 24
  return ptr + 4
}

const readU8 = (buffer: Uint8Array, ptr: number) => {
  return buffer[ptr]!
}

const readU16LE = (buffer: Uint8Array, ptr: number) => {
  return buffer[ptr]! | buffer[ptr + 1]! << 8
}

const readU32LE = (buffer: Uint8Array, ptr: number) => {
  return buffer[ptr]! | buffer[ptr + 1]! << 8 | buffer[ptr + 2]! << 16 | buffer[ptr + 3]! << 24
}

const readCString = (buffer: Uint8Array, ptr: number, maxLength: number) => {
  const charCodes = []

  for (let idx = ptr; idx < ptr + maxLength; idx++) {
    const charCode = buffer[idx]!
    if (charCode === 0)
      break

    charCodes.push(charCode)
  }

  return String.fromCharCode(...charCodes)
}

export const serializePsuEntry = (info: McEntryInfo) => {
  const buffer = new Uint8ClampedArray(ENTRY_SIZE)

  writeU16LE(buffer, 0x000, info.stat.mode)
  writeU32LE(buffer, 0x004, info.stat.size)
  writeU8(buffer, 0x008, info.stat.ctime.resv2)
  writeU8(buffer, 0x009, info.stat.ctime.sec)
  writeU8(buffer, 0x00A, info.stat.ctime.min)
  writeU8(buffer, 0x00B, info.stat.ctime.hour)
  writeU8(buffer, 0x00C, info.stat.ctime.day)
  writeU8(buffer, 0x00D, info.stat.ctime.month)
  writeU16LE(buffer, 0x00E, info.stat.ctime.year)
  writeU8(buffer, 0x018, info.stat.mtime.resv2)
  writeU8(buffer, 0x019, info.stat.mtime.sec)
  writeU8(buffer, 0x01A, info.stat.mtime.min)
  writeU8(buffer, 0x01B, info.stat.mtime.hour)
  writeU8(buffer, 0x01C, info.stat.mtime.day)
  writeU8(buffer, 0x01D, info.stat.mtime.month)
  writeU16LE(buffer, 0x01E, info.stat.mtime.year)

  let ptr = 0x040
  for (let idx = 0; idx < Math.min(info.name.length, MAX_NAME_LENGTH); idx++) {
    const charCode = info.name.charCodeAt(idx);
    ptr = writeU8(buffer, ptr, charCode)
  }

  return buffer
}

export const deserializePsuEntry = (buffer: Uint8Array, offset: number): McEntryInfo => {
  return {
    stat: {
      mode: readU16LE(buffer, offset + 0x000),
      attr: 0,
      size: readU32LE(buffer, offset + 0x004),
      ctime: {
        resv2: readU8(buffer, offset + 0x008),
        sec: readU8(buffer, offset + 0x009),
        min: readU8(buffer, offset + 0x00A),
        hour: readU8(buffer, offset + 0x00B),
        day: readU8(buffer, offset + 0x00C),
        month: readU8(buffer, offset + 0x00D),
        year: readU16LE(buffer, offset + 0x00E),
      },
      mtime: {
        resv2: readU8(buffer, offset + 0x018),
        sec: readU8(buffer, offset + 0x019),
        min: readU8(buffer, offset + 0x01A),
        hour: readU8(buffer, offset + 0x01B),
        day: readU8(buffer, offset + 0x01C),
        month: readU8(buffer, offset + 0x01D),
        year: readU16LE(buffer, offset + 0x01E),
      },
    },
    name: readCString(buffer, offset + 0x040, MAX_NAME_LENGTH)
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
      console.log(file)
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
