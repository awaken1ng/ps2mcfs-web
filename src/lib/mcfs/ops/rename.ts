import { McEntryInfo, type Module, sceMcFileAttrFile, sceMcResSucceed } from "ps2mcfs-wasm/mcfs"
import { type State } from "../state"
import { joinPath } from "../utils"
import { checkEntryExistence } from "./exists"
import { notifyError, notifyErrorWithCode } from "../error"

export interface RenameEntryOpts {
  root: string,
  entry: McEntryInfo,
  newName: string,
}

export const renameEntry = (mcfs: Module, state: State, opts: RenameEntryOpts) => {
  const newPath = joinPath(opts.root, opts.newName)
  if (checkEntryExistence(mcfs, newPath) !== false) {
    notifyError({ message: `Failed to rename, ${opts.newName} already exists` })
    return
  }

  const filePath = joinPath(opts.root, opts.entry.name)
  const code = mcfs.setInfo(filePath, opts.entry.stat, opts.newName, sceMcFileAttrFile)
  if (code !== sceMcResSucceed) {
    notifyErrorWithCode(`Failed to rename ${filePath}`, code)
  }

  state.hasUnsavedChanges = true
}
