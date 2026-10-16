import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite'

// 新的 SSO 登入頁（#47）：和會員中心共用 src/ 的 theme 與元件，但另外 build 成一包（dist-sso/），
// 上線時由 logto/Dockerfile 把這包換進 Logto 映像、取代內建登入頁（同網域，/api、/oidc 照舊由 Logto 處理，#43）。
// 不帶 PWA 與 MSW。說明見 src/sso/README.md。
const frontendDir = fileURLToPath(new URL('.', import.meta.url))

// 這包網頁不能帶進會員中心的登入狀態與 Logto SDK（共用元件要 import src/api/errors.ts，不要 import src/api/client.ts）。
// 不小心引入時直接讓 build 失敗，並印出是誰引入的（依序檢查，先報離我們程式最近的那個）。
const FORBIDDEN_IMPORTS = [/\/src\/api\/client\.ts$/, /\/src\/auth\//, /\/src\/mocks\//, /\/node_modules\/(@logto|msw)\//]

function forbidMemberCenterImports(): Plugin {
  return {
    name: 'sso-forbid-member-center-imports',
    apply: 'build',
    buildEnd() {
      const ids = [...this.getModuleIds()]
      for (const pattern of FORBIDDEN_IMPORTS) {
        const id = ids.find((moduleId) => pattern.test(moduleId))
        if (!id) continue
        const importers = this.getModuleInfo(id)?.importers ?? []
        this.error(`SSO 登入頁不可引入 ${id}（被 ${importers.join(', ') || '?'} 引入），見 src/sso/README.md`)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, frontendDir, '')
  // 開發時登入頁要和 Logto 同網域（cookie 才帶得到），所以把 Logto 的路徑整個轉給真的 SSO
  const target = env.VITE_SSO_PROXY_TARGET || 'https://sso.newlife.org.tw'
  const toSso: ProxyOptions = {
    target,
    changeOrigin: true,
    // Logto 回的轉址（例如完成登入後的 /oidc/auth/:uid）若是 SSO 完整網址，改成本機路徑，才不會跳離本機的 cookie
    configure: (proxy) => {
      proxy.on('proxyRes', (res) => {
        const location = res.headers.location
        if (typeof location === 'string' && location.startsWith(target)) {
          res.headers.location = location.slice(target.length) || '/'
        }
      })
    },
  }

  return {
    root: 'sso',
    envDir: frontendDir,
    // sso/public 只放登入頁需要的圖示（會員中心的 public/ 有 PWA 與 MSW 檔案，不要帶進來）
    publicDir: 'public',
    // 和會員中心的 dev server 同時跑時不要共用 node_modules/.vite（會互相覆寫）
    cacheDir: '../node_modules/.vite-sso',
    plugins: [react(), forbidMemberCenterImports()],
    build: {
      outDir: '../dist-sso',
      // 不用預設的 /assets，和 Logto 原本登入頁的靜態檔分開（瀏覽器快取的舊頁檔案不會混進來，退回舊頁也不互相影響）。
      // Logto 會直接回 dist 裡有的檔名（sso-assets/、favicon.ico、logo.svg），其他路徑一律回 index.html。
      assetsDir: 'sso-assets',
      emptyOutDir: true,
    },
    server: {
      // 會員中心用 5173，這包用 5174；預覽工具以 PORT 指定（launch.json autoPort）
      port: process.env.PORT ? Number(process.env.PORT) : 5174,
      strictPort: !process.env.PORT,
      proxy: {
        '/api': toSso,
        '/oidc': toSso,
        '/.well-known': toSso,
      },
    },
    preview: { port: 4174 },
  }
})
