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
