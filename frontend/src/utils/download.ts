/**
 * 用網址下載檔案（不經過 API client：檔案網址由後端即時產生，例如雲端儲存的簽章網址）。
 * 同源網址與 blob: 網址會用 fileName 存檔；跨網域的簽章網址由後端設定 Content-Disposition: attachment 決定檔名。
 */
export function downloadFromUrl(url: string, fileName: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
