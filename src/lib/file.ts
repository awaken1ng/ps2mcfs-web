import { useFileDialog, UseFileDialogOptions } from "@vueuse/core"

export function useOpenFileDialog(options?: Omit<UseFileDialogOptions, 'multiple'>) {
  const { open, onChange, onCancel } = useFileDialog(options)

  let change: ReturnType<typeof onChange>
  let cancel: ReturnType<typeof onCancel>

  type Multiple = Required<Pick<UseFileDialogOptions, 'multiple'>>

  function openAsync(localOptions: { multiple: true }): Promise<File[]>

  function openAsync(localOptions: { multiple: false }): Promise<File>

  function openAsync(localOptions: Multiple): Promise<File[] | File> {
    return new Promise<File[] | File>((resolve, reject) => {
      change = onChange((pickedFiles) => {
        const isSingle = localOptions.multiple === false

        if (isSingle) {
          if (pickedFiles) {
            for (const file of pickedFiles) {
              resolve(file)
              return
            }
          }
        } else {
          const files: File[] = []

          if (pickedFiles) {
            for (const file of pickedFiles) {
              files.push(file)
            }
          }

          resolve(files)
        }
      })

      cancel = onCancel(() => reject)

      open(localOptions)
    })
    .finally(() => {
      change.off()
      cancel.off()
    })
  }


  return { open: openAsync }
}

export const useSaveFileDialog = () => {
  const anchor = document.createElement('a')

  const saveAsBlob = (fileName: string, contents: Uint8Array) => {
    const opts = { type: 'application/octet-stream' }
    const file = new File([contents], '', opts)

    anchor.href = window.URL.createObjectURL(file)
    anchor.setAttribute('download', fileName)
    anchor.click()
  }

  return {
    saveAsBlob
  }
}
