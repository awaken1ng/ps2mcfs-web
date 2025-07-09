import {
  type Module,
  mcFileUpdateAttrMode,
  mcFileUpdateAttrCtime,
  mcFileUpdateAttrMtime,
  mcFileUpdateName,
  McIoStat,
  McStDateTime,
  sceMcResSucceed,
} from 'ps2mcfs-wasm/mcfs'
import { notifyErrorWithCode } from '../error'
import { type State } from "../state"

const EMPTY_DATE: McStDateTime = {
  resv2: 0,
  sec: 0,
  min: 0,
  hour: 0,
  day: 0,
  month: 0,
  year: 0
}

interface SetAttributesOpts {
  path: string,
  attributes?: number,
  created?: McStDateTime,
  modified?: McStDateTime,
  name?: string,
}

export const setAttributes = (mcfs: Module, state: State, opts: SetAttributesOpts) => {
  let flags = 0
  if (opts.attributes !== undefined)
    flags |= mcFileUpdateAttrMode
  if (opts.created)
    flags |= mcFileUpdateAttrCtime
  if (opts.modified)
    flags |= mcFileUpdateAttrMtime
  if (opts.name)
    flags |= mcFileUpdateName

  if (flags) {
    const info: McIoStat = {
      mode: opts.attributes || 0,
      attr: 0,
      size: 0,
      ctime: opts.created || EMPTY_DATE,
      mtime: opts.modified || EMPTY_DATE,
    }

    const code = mcfs.setInfo(opts.path, info, opts.name || '', flags)
    if (code !== sceMcResSucceed) {
      notifyErrorWithCode(`Failed to set attributes for ${opts.path}`, code)
    }

    state.hasUnsavedChanges = true
  }
}
