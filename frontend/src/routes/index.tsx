import { createBrowserRouter, type RouteObject } from 'react-router'
import { GuestOnly, RequireAuth, RequireRole } from '../auth/guards'
import GuestLayout from '../layouts/GuestLayout'
import MemberLayout from '../layouts/MemberLayout'
import ChangePassword from '../pages/ChangePassword'
import Forbidden from '../pages/Forbidden'
import GuestPlaceholder from '../pages/GuestPlaceholder'
import Home from '../pages/Home'
import LineCallback from '../pages/login/LineCallback'
import Login from '../pages/login/Login'
import MemberPlaceholder from '../pages/MemberPlaceholder'
import MemberReview from '../pages/member-review/MemberReview'
import NotFound from '../pages/NotFound'
import PendingApproval from '../pages/PendingApproval'
import Profile from '../pages/profile/Profile'
import ProfileEdit from '../pages/profile/ProfileEdit'
import RegisterDone from '../pages/register/RegisterDone'
import RegisterLineSuccess from '../pages/register/RegisterLineSuccess'
import RegisterPrivacy from '../pages/register/RegisterPrivacy'
import RegisterProfile from '../pages/register/RegisterProfile'
import { PATHS } from './paths'

// 開發用頁面：只在 dev 模式註冊；import.meta.env.DEV 讓正式 build 連同動態 import 一起移除
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: PATHS.devOtp, lazy: async () => ({ Component: (await import('../mocks/OtpDemo')).default }) }]
  : []

// 路由表（#10）。路徑一律用 routes/paths.ts 的 PATHS；*Placeholder 為尚未實作的頁面，完成後直接替換 element。
// 可見角色要與 layouts/memberNav.ts 的選單／首頁卡片設定一致。
export const router = createBrowserRouter([
  ...devRoutes,
  // 未登入：已登入（且已核准）會被導回原頁或首頁
  {
    element: <GuestOnly />,
    children: [
      {
        element: <GuestLayout />,
        children: [
          { path: PATHS.login, element: <Login /> },
          { path: PATHS.register, element: <GuestPlaceholder title="創建帳號" /> },
          { path: PATHS.registerPrivacy, element: <RegisterPrivacy /> },
          // 全寬表單：頁面內以 useGuestLayout('full') 切換版型
          { path: PATHS.registerProfile, element: <RegisterProfile /> },
          { path: PATHS.forgotPassword, element: <GuestPlaceholder title="忘記密碼" /> },
          // TODO(#12)：進度查詢設計未畫（查詢條件推測為信箱＋手機，見 api/register.ts queryProgress）
          { path: PATHS.progress, element: <GuestPlaceholder title="進度查詢" /> },
        ],
      },
      // Line 登入導回：只顯示 loading 遮罩，不套卡片版型
      { path: PATHS.lineCallback, element: <LineCallback /> },
      // 註冊結果頁：整頁置中、無卡片
      { path: PATHS.registerDone, element: <RegisterDone /> },
      { path: PATHS.registerLine, element: <RegisterLineSuccess /> },
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
          { path: PATHS.profileEdit, element: <ProfileEdit /> },
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
