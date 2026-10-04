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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhTW} theme={theme}>
      <AntdApp>
        <RouterProvider router={router} />
        <PwaUpdatePrompt />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
