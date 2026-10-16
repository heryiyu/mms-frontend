import { App as AntdApp, ConfigProvider } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import { isLogtoEnabled, syncSessionWithLogto } from './auth/logto'
import PwaUpdatePrompt from './components/PwaUpdatePrompt'
import { router } from './routes'
import './styles/global.css'
import { componentConfig, theme } from './theme'

// MSW 假資料：開發模式預設啟用，在 .env.local 設 VITE_USE_MOCK=false 可關閉；
// 正式 build 預設不啟用，VITE_USE_MOCK=true 時才啟用（後端匯入前的線上展示，見 .env.example）
const useMock = import.meta.env.DEV ? import.meta.env.VITE_USE_MOCK !== 'false' : import.meta.env.VITE_USE_MOCK === 'true'

async function enableMocking(): Promise<boolean> {
  if (!useMock) return false
  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
    return true
  } catch (error) {
    // 例如瀏覽器擋 Service Worker：不要因此讓整個 App 無法開啟，API 會改走 vite proxy
    console.error('[MSW] 假資料啟動失敗，API 將改打真實後端', error)
    return false
  }
}

const mockEnabled = await enableMocking()

// Logto 模式（#44）：登入狀態還在、但 Logto token 已不在時視為未登入，避免畫面先進會員中心再被 401 踢出
await syncSessionWithLogto()

// 開發用切換登入身分（只在 MSW 啟用且為本機模式時出現；import.meta.env.DEV 讓正式 build 不會打包進去）。
// Logto 模式的 token 由 Logto 發，切換不了身分，改用 VITE_MOCK_LOGTO_EMAIL（見 src/mocks/README.md）
const DevRoleSwitcher = import.meta.env.DEV && !isLogtoEnabled ? lazy(() => import('./mocks/DevRoleSwitcher')) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhTW} theme={theme} {...componentConfig}>
      <AntdApp>
        <RouterProvider router={router} />
        {/* MSW 與 PWA 的 Service Worker 都註冊在 scope /，同一個 scope 只能有一個：用假資料時不註冊 PWA */}
        {!mockEnabled && <PwaUpdatePrompt />}
        {mockEnabled && DevRoleSwitcher && (
          <Suspense>
            <DevRoleSwitcher />
          </Suspense>
        )}
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
