import { CF_USE_ECC, McFatSetCardSpecs, type Module, sceMcResSucceed } from "ps2mcfs-wasm/mcfs"
import { type State } from "../state"
import { notifyErrorWithCode } from "../error"

const readCardSpecs = (array: Uint8Array): McFatSetCardSpecs => {
  const view = new DataView(array.buffer)

  const pageSize = view.getUint16(40, true)
  const pagesPerCluster =  view.getUint16(42, true)
  const blockSize = view.getUint16(44, true)
  const clustersPerCard = view.getUint32(48, true)
  const cardFlags = view.getUint8(337)
  const cardPages = clustersPerCard * pagesPerCluster

  return { pageSize, blockSize, cardPages, cardFlags }
}

export const newCardInMemory = (mcfs: Module, state: State): boolean => {
  try {
    state.isLoading = true
    state.isLoaded = false

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

    const cardFree = getAvailableSpace(mcfs)
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

export interface OpenCardFromMemoryOpts {
  vmc: Uint8Array,
}

export const openCardFromMemory = (mcfs: Module, state: State, opts: OpenCardFromMemoryOpts): boolean => {
  try {
    state.isLoading = true
    state.isLoaded = false

    const cardSpecs = readCardSpecs(opts.vmc)

    if (!isEccImage(opts.vmc.length))
      cardSpecs.cardFlags ^= CF_USE_ECC // remove ECC bit

    mcfs.setCardBuffer(opts.vmc)
    mcfs.setCardSpecs(cardSpecs)
    mcfs.setCardChanged(true)
    const code = mcfs.init()
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode('Failed to open memory card', code)
      return false
    }

    const cardFree = getAvailableSpace(mcfs)
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

export interface SaveCardToMemoryOpts {
  withEcc: boolean,
  onProgress?: (bytesWritten: number, bytesToWrite: number) => void,
}

export const saveCardToMemory = (mcfs: Module, state: State, opts: SaveCardToMemoryOpts) => {
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

export const closeCard = (state: State) => {
  state.availableSpace = 0
  state.cardSize = 0
  state.isLoaded = false
  state.hasUnsavedChanges = false
}

export const getAvailableSpace = (mcfs: Module) => {
  const result = mcfs.getAvailableSpace()
  if ('code' in result) {
    notifyErrorWithCode('Failed to read available space', result.code)
    return
  }

  return result.availableSpace
}

export const isNonEccImage = (cardSize: number) => cardSize % 1024 === 0

export const isEccImage = (cardSize: number) => cardSize % 1056 === 0
