// 新的 SSO 登入頁（#47）進入點：vite.sso.config.ts → sso/index.html → 這裡。
// 和會員中心共用 theme、元件與 GuestLayout，但不載入 PWA、MSW、Logto SDK 與會員中心的登入狀態。
import { App as AntdApp, ConfigProvider } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import '../styles/global.css'
import { componentConfig, theme } from '../theme'
import { router } from './routes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhTW} theme={theme} {...componentConfig}>
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
