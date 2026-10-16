import type { ComponentType } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import PageLoading from '../components/PageLoading'
import GuestLayout from '../layouts/GuestLayout'
import SsoNotFound from './pages/SsoNotFound'
import ToMemberCenter from './pages/ToMemberCenter'
import { SSO_PATHS } from './paths'

/** 頁面依路由拆包（同會員中心 src/routes/index.tsx）：進到該頁才下載程式碼 */
function page(load: () => Promise<{ default: ComponentType }>): RouteObject['lazy'] {
  return async () => ({ Component: (await load()).default })
}

// 各頁由 #47 的子 issue 實作：登入 #55、註冊 #56、忘記密碼 #57、社群登入 #58；授權同意頁 #74。
// 頁面內的步驟（例如註冊的驗證碼、填資料）在同一個路徑內切換，不要新增路徑：Logto 只認得這幾個。
const routes: RouteObject[] = [
  {
    element: <GuestLayout />,
    hydrateFallbackElement: <PageLoading />,
    children: [
      { path: SSO_PATHS.signIn, lazy: page(() => import('./pages/SignIn')) },
      { path: SSO_PATHS.identifierSignIn, element: <Navigate to={SSO_PATHS.signIn} replace /> },
      { path: SSO_PATHS.register, lazy: page(() => import('./pages/Register')) },
      { path: SSO_PATHS.identifierRegister, element: <Navigate to={SSO_PATHS.register} replace /> },
      { path: SSO_PATHS.resetPassword, lazy: page(() => import('./pages/ResetPassword')) },
      { path: SSO_PATHS.forgotPassword, element: <Navigate to={SSO_PATHS.resetPassword} replace /> },
      { path: SSO_PATHS.socialCallback, lazy: page(() => import('./pages/SocialCallback')) },
      { path: SSO_PATHS.consent, lazy: page(() => import('./pages/Consent')) },
    ],
  },
  { path: '/', element: <ToMemberCenter /> },
  { path: SSO_PATHS.unknownSession, element: <ToMemberCenter /> },
  { path: SSO_PATHS.error, element: <SsoNotFound title="登入發生錯誤" /> },
  { path: '*', element: <SsoNotFound /> },
]

export const router = createBrowserRouter(routes)
