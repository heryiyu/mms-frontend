import { createBrowserRouter } from 'react-router'
import { GuestOnly, RequireAuth, RequireRole } from '../auth/guards'
import GuestLayout from '../layouts/GuestLayout'
import MemberLayout from '../layouts/MemberLayout'
import ChangePassword from '../pages/ChangePassword'
import Forbidden from '../pages/Forbidden'
import GuestPlaceholder from '../pages/GuestPlaceholder'
import Home from '../pages/Home'
import MemberPlaceholder from '../pages/MemberPlaceholder'
import MemberReview from '../pages/member-review/MemberReview'
import NotFound from '../pages/NotFound'
import PendingApproval from '../pages/PendingApproval'
import Profile from '../pages/Profile'
import RegisterPrivacy from '../pages/register/RegisterPrivacy'
import { PATHS } from './paths'

// 路由表（#10）。路徑一律用 routes/paths.ts 的 PATHS；*Placeholder 為尚未實作的頁面，完成後直接替換 element。
// 可見角色要與 layouts/memberNav.ts 的選單／首頁卡片設定一致。
export const router = createBrowserRouter([
  // 未登入：已登入（且已核准）會被導回原頁或首頁
  {
    element: <GuestOnly />,
    children: [
      {
        element: <GuestLayout />,
        children: [
          { path: PATHS.login, element: <GuestPlaceholder title="登入" brand /> },
          { path: PATHS.register, element: <GuestPlaceholder title="創建帳號" /> },
          { path: PATHS.registerPrivacy, element: <RegisterPrivacy /> },
          { path: PATHS.forgotPassword, element: <GuestPlaceholder title="忘記密碼" /> },
        ],
      },
    ],
  },
  // 等待審核：登入與否皆可開啟
  { path: PATHS.pending, element: <PendingApproval /> },
  // 已登入：未登入 → 登入頁；等待審核中 → 等待審核頁
  {
    element: <RequireAuth />,
    children: [
      {
        element: <MemberLayout />,
        children: [
          { path: PATHS.home, element: <Home /> },
          { path: PATHS.profile, element: <Profile /> },
          { path: PATHS.changePassword, element: <ChangePassword /> },
          { path: PATHS.receipt, element: <MemberPlaceholder title="奉獻收據下載" /> },
          // 區長以上；權限不足 → 403
          {
            element: <RequireRole minRole="leader" />,
            children: [
              { path: PATHS.memberReview, element: <MemberReview /> },
              // TODO(#12)：系統設定的功能與可見角色待確認
              { path: PATHS.settings, element: <MemberPlaceholder title="系統設定" /> },
            ],
          },
          { path: PATHS.forbidden, element: <Forbidden /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
])
