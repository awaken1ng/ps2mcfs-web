export const getFilesLegacy = (picker: HTMLInputElement) => {
  return new Promise<File[]>(resolve => {
    picker.onchange = () => {
      const files: File[] = []

      if (picker.files) {
        for (const file of picker.files) {
          files.push(file)
        }
      }

      resolve(files)
    }
    picker.click()
  })
}

export const getFileLegacy = async (picker: HTMLInputElement) =>
  getFilesLegacy(picker).then(files => files[0])

export const saveAsLegacy = (saver: HTMLAnchorElement, fileName: string, contents: Uint8Array) => {
  const opts = { type: 'application/octet-stream' }

  const file = new File([contents], '', opts)
  saver.href = window.URL.createObjectURL(file)
  saver.setAttribute('download', fileName)
  saver.click()
}
