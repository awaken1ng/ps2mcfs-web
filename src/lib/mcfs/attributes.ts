import {
  McEntryInfo,
  sceMcFileAttrReadable,
  sceMcFileAttrWriteable,
  sceMcFileAttrExecutable,
  sceMcFileAttrDupProhibit,
  sceMcFileAttrHidden,
  sceMcFileAttrFile,
  sceMcFileAttrSubdir,
  sceMcFileAttrPDAExec,
  sceMcFileAttrPS1,
} from 'ps2mcfs-wasm/mcfs'

export const isEntryReadable = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrReadable)
export const isEntryWriteable = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrWriteable)
export const isEntryExecutale = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrExecutable)
export const isEntryProtected = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrDupProhibit)
export const isEntryHidden = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrHidden)
export const isFileEntry = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrFile)
export const isDirectoryEntry = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrSubdir)
export const isPocketStationSave = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrPDAExec)
export const isPs1Save = (entry: McEntryInfo) => Boolean(entry.stat.mode & sceMcFileAttrPS1)
