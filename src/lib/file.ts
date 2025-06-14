export const getFileLegacy = (picker: HTMLInputElement) => {
  return new Promise<File>((resolve, reject) => {
    picker.onchange = () => {
      const file = picker.files?.[0]
      if (file) {
        resolve(file)
        return
      }
      reject(new Error('AbortError'))
    }
    picker.click()
  })
}

export const saveAsLegacy = (saver: HTMLAnchorElement, fileName: string, contents: Uint8Array) => {
  const opts = { type: 'application/octet-stream' }

  const file = new File([contents], '', opts)
  saver.href = window.URL.createObjectURL(file)
  saver.setAttribute('download', fileName)
  saver.click()
}
