import {
  type Module,
  McEntryInfo,
  sceMcFileAttrFile,
  sceMcFileAttrReadable,
  sceMcFileAttrWriteable,
  sceMcFileCreateFile,
  sceMcResSucceed,
} from "ps2mcfs-wasm/mcfs"
import { type State } from "../state"
import { joinPath } from "../utils"
import { notifyError, notifyErrorWithCode } from "../error"

export interface ReadFileEntryOpts {
  root: string,
  entry: McEntryInfo,
}

export const readFileEntry = (mcfs: Module, opts: ReadFileEntryOpts) => {
  const filePath = joinPath(opts.root, opts.entry.name)
  const fd = mcfs.open(filePath, sceMcFileAttrFile | sceMcFileAttrReadable)
  if (fd < 0) {
    notifyErrorWithCode(`Failed to open file ${filePath} for reading`, fd)
    return
  }

  const result = mcfs.read(fd, opts.entry.stat.size)
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

export interface WriteFileOpts {
  path: string,
  data: Uint8Array,
}

export const writeFile = (mcfs: Module, state: State, opts: WriteFileOpts) => {
  const fd = mcfs.open(opts.path, sceMcFileAttrFile | sceMcFileCreateFile | sceMcFileAttrWriteable)
  if (fd < 0) {
    notifyErrorWithCode(`Failed to open file ${opts.path} for writing`, fd)
    return false
  }

  let ret = true
  const written = mcfs.write(fd, opts.data)
  if (written < 0) {
    notifyErrorWithCode(`Failed to write file ${opts.path}`, written)
    ret = false
    // fallthrough to close the file
  } else if (written !== opts.data.length) {
    notifyError({ message: `Incomplete write, written ${written} bytes out of ${opts.data.length} in ${opts.path}` })
    ret = false
    // fallthrough to close the file
  }

  const code = mcfs.close(fd)
  if (code !== sceMcResSucceed) {
    notifyErrorWithCode(`Failed to close file ${opts.path} after writing`, code)
    ret = false
  }

  state.hasUnsavedChanges = true
  return ret
}
