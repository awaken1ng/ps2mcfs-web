import { McFatSetCardSpecs } from 'ps2mcfs-wasm/mcfs'

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

export const joinPath = (a: string, b: string) => {
  if (a[a.length - 1] !== '/')
    a += '/'
  a += b
  return a
}

export const MAX_NAME_LENGTH = 31

const ILLEGAL_NAME_CHARACTERS = [
  0x2A, // *
  0x2F, // /
  0x3F, // ?
]

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
