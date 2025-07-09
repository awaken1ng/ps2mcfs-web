import { notifyError, notifyWarning } from "lib/utils"

export { notifyError, notifyWarning }

export const notifyErrorWithCode = (message: string, code: number) =>
  notifyError({ message, caption: `Error code ${code}` })
