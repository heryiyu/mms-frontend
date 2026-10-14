import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import GuestLayout from '../layouts/GuestLayout'
import Placeholder from './pages/Placeholder'
import SsoNotFound from './pages/SsoNotFound'
import ToMemberCenter from './pages/ToMemberCenter'
import { SSO_PATHS } from './paths'

// 佔位頁由 #47 的子 issue 換成真正的頁面（登入、註冊、忘記密碼、社群登入）；頁面多了再改成 lazy 拆包
const routes: RouteObject[] = [
  {
    element: <GuestLayout />,
    children: [
      { path: SSO_PATHS.signIn, element: <Placeholder title="登入" /> },
      { path: SSO_PATHS.identifierSignIn, element: <Navigate to={SSO_PATHS.signIn} replace /> },
      { path: SSO_PATHS.register, element: <Placeholder title="註冊" /> },
      { path: SSO_PATHS.identifierRegister, element: <Navigate to={SSO_PATHS.register} replace /> },
      { path: SSO_PATHS.resetPassword, element: <Placeholder title="忘記密碼" /> },
      { path: SSO_PATHS.forgotPassword, element: <Navigate to={SSO_PATHS.resetPassword} replace /> },
      { path: SSO_PATHS.socialCallback, element: <Placeholder title="社群登入" /> },
    ],
  },
  { path: '/', element: <ToMemberCenter /> },
  { path: SSO_PATHS.unknownSession, element: <ToMemberCenter /> },
  { path: SSO_PATHS.error, element: <SsoNotFound title="登入發生錯誤" /> },
  { path: '*', element: <SsoNotFound /> },
]

export const router = createBrowserRouter(routes)
