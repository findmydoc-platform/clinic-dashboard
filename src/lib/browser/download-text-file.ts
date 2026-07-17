type DownloadTextFileOptions = Readonly<{
  content: string
  fileName: string
  mimeType: string
}>

export function downloadTextFile({ content, fileName, mimeType }: DownloadTextFileOptions) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
