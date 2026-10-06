import { App as AntdApp, ConfigProvider } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import PwaUpdatePrompt from './components/PwaUpdatePrompt'
import { router } from './routes'
import './styles/global.css'
import { theme } from './theme'

// 開發模式預設啟用 MSW 假資料；在 .env.local 設 VITE_USE_MOCK=false 可關閉（見 .env.example）
async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MOCK === 'false') return
  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
  } catch (error) {
    // 例如瀏覽器擋 Service Worker：不要因此讓整個 App 無法開啟，API 會改走 vite proxy
    console.error('[MSW] 假資料啟動失敗，API 將改打真實後端', error)
  }
}

await enableMocking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* autoInsertSpace：AntD 預設在兩個中文字的按鈕中間插空格（「確 認」），設計稿沒有 */}
    <ConfigProvider locale={zhTW} theme={theme} button={{ autoInsertSpace: false }}>
      <AntdApp>
        <RouterProvider router={router} />
        <PwaUpdatePrompt />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
