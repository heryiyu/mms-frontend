// 決定 sso.newlife.org.tw 的登入頁路徑要給新登入頁（ASSETS）還是 Logto 原頁（origin）。說明見 ../README.md。
// 只有 wrangler.jsonc routes 列出的路徑會進來，/api、/oidc、/.well-known 不經過這裡。

const COOKIE_NAME = 'nlc_sso_preview'
const PREVIEW_PARAM = 'nlc_preview'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 天
// 新登入頁自己的靜態檔：Logto 沒有這些路徑，一律給新頁的檔案（通常在 run_worker_first 就直接給了，不會進來）
const STATIC_PATHS = [/^\/sso-assets\//, /^\/favicon\.ico$/, /^\/logo\.svg$/]

function hasPreviewCookie(request) {
  const cookie = request.headers.get('Cookie') || ''
  return cookie.split(';').some((part) => part.trim() === `${COOKIE_NAME}=1`)
}

function previewCookieHeader(on) {
  return on
    ? `${COOKIE_NAME}=1; Path=/; Max-Age=${COOKIE_MAX_AGE}; Secure; HttpOnly; SameSite=Lax`
    : `${COOKIE_NAME}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`
}

/** 這次要不要給新頁。MODE：all 所有人、off 沒有人、其他（預設 preview）看預覽 cookie */
function useNewPage(mode, previewOn) {
  if (mode === 'all') return true
  if (mode === 'off') return false
  return previewOn
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (STATIC_PATHS.some((pattern) => pattern.test(url.pathname))) {
      return env.ASSETS.fetch(request)
    }

    // ?nlc_preview=1 開啟、=0 關閉自己的預覽（這次的回應就照新的狀態）
    const param = url.searchParams.get(PREVIEW_PARAM)
    const setPreview = param === '1' ? true : param === '0' ? false : null
    const previewOn = setPreview ?? hasPreviewCookie(request)
    const isNew = useNewPage(env.MODE, previewOn)

    const upstream = isNew
      ? await env.ASSETS.fetch(request)
      : // 原封不動轉給 Logto；轉址（例如沒有登入流程時 302 回會員中心）照原樣回給瀏覽器
        await fetch(request, { redirect: 'manual' })

    // 複製一份才能改 header
    const response = new Response(upstream.body, upstream)
    response.headers.set('X-NLC-SSO', isNew ? 'new' : 'logto')
    // 同一網址依 cookie 回不同內容，不要讓快取混用
    response.headers.append('Vary', 'Cookie')
    if (setPreview !== null) {
      response.headers.append('Set-Cookie', previewCookieHeader(setPreview))
    }
    return response
  },
}
