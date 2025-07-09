import { type Module, sceMcResNoEntry, sceMcResNotFile, sceMcResSucceed } from "ps2mcfs-wasm/mcfs"
import { notifyErrorWithCode } from "../error"

export const checkEntryExistence = (mcfs: Module, path: string) => {
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
