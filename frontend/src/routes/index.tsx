import type { ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { GuestOnly, RequireApplicant, RequireAuth, RequireRole } from '../auth/guards'
import { isLogtoEnabled } from '../auth/logto'
import PageLoading from '../components/PageLoading'
import GuestLayout from '../layouts/GuestLayout'
import MemberLayout from '../layouts/MemberLayout'
import { PATHS } from './paths'

/**
 * 頁面依路由拆包：進到該頁才下載程式碼。版型與守衛維持同步載入，避免換頁時版型閃爍。
 * 用法：`{ path, lazy: page(() => import('../pages/Xxx')) }`；需要 props 時用 `pageWith`。
 */
function page(load: () => Promise<{ default: ComponentType }>): RouteObject['lazy'] {
  return async () => ({ Component: (await load()).default })
}

function pageWith<P extends object>(load: () => Promise<{ default: ComponentType<P> }>, props: P): RouteObject['lazy'] {
  return async () => {
    const { default: Page } = await load()
    return { Component: () => <Page {...props} /> }
  }
}

// 開發用頁面：只在 dev 模式註冊；import.meta.env.DEV 讓正式 build 連同動態 import 一起移除
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: PATHS.devOtp, lazy: page(() => import('../mocks/OtpDemo')) }]
  : []

// 登入、註冊、忘記密碼的入口。Logto 模式（#44，src/auth/logto.ts）改由 Logto 登入頁處理，這三個路徑只負責轉址；
// 註冊與忘記密碼的後續步驟頁面仍保留在路由表，本機模式才會用到。
const logtoSignIn = (firstScreen?: 'register' | 'reset_password') =>
  pageWith(() => import('../pages/login/LogtoSignIn'), { firstScreen })

const authEntryRoutes: RouteObject[] = isLogtoEnabled
  ? [
      { path: PATHS.login, lazy: logtoSignIn() },
      { path: PATHS.register, lazy: logtoSignIn('register') },
      { path: PATHS.forgotPassword, lazy: logtoSignIn('reset_password') },
    ]
  : [
      { path: PATHS.login, lazy: page(() => import('../pages/login/Login')) },
      { path: PATHS.register, lazy: page(() => import('../pages/register/Register')) },
      { path: PATHS.forgotPassword, lazy: page(() => import('../pages/forgot-password/ForgotPassword')) },
    ]

// Logto 登入完成的導回頁：放在 GuestOnly 外，由頁面自己導回原頁（GuestOnly 只會導回首頁）
const logtoCallbackRoutes: RouteObject[] = isLogtoEnabled
  ? [{ path: PATHS.signInCallback, lazy: page(() => import('../pages/login/LogtoCallback')) }]
  : []

// 第一次用 SSO 登入、還沒有會員資料（#48）：出生／補填聯絡方式 → 個資聲明 → 會員資料 → 等待核准中（PATHS.registerDone）。
// 個資聲明與會員資料沿用註冊流程的頁面（flow = 'apply'）。只有 Logto 模式會用到。
const applyRoutes: RouteObject[] = isLogtoEnabled
  ? [
      {
        element: <RequireApplicant />,
        children: [
          {
            element: <GuestLayout />,
            children: [
              { path: PATHS.apply, lazy: page(() => import('../pages/apply/ApplyBasic')) },
              {
                path: PATHS.applyPrivacy,
                lazy: pageWith(() => import('../pages/register/RegisterPrivacy'), { flow: 'apply' as const }),
              },
              // 全寬表單：頁面內以 useGuestLayout('full') 切換版型
              {
                path: PATHS.applyProfile,
                lazy: pageWith(() => import('../pages/register/RegisterProfile'), { flow: 'apply' as const }),
              },
            ],
          },
          // 整頁結果版面，不套卡片
          { path: PATHS.applyRejected, lazy: page(() => import('../pages/apply/ApplyRejected')) },
        ],
      },
    ]
  : []

// 路由表（#10）。路徑一律用 routes/paths.ts 的 PATHS；*Placeholder 為尚未實作的頁面，完成後直接替換。
// 可見角色要與 layouts/memberNav.ts 的選單／首頁卡片設定一致。
export const router = createBrowserRouter([
  {
    // 首次進站、頁面程式碼尚未下載完成時的佔位
    hydrateFallbackElement: <PageLoading />,
    children: [
      ...devRoutes,
      // 未登入：已登入（且已核准）會被導回原頁或首頁
      {
        element: <GuestOnly />,
        children: [
          {
            element: <GuestLayout />,
            children: [
              ...authEntryRoutes,
              { path: PATHS.registerPrivacy, lazy: page(() => import('../pages/register/RegisterPrivacy')) },
              // 全寬表單：頁面內以 useGuestLayout('full') 切換版型
              { path: PATHS.registerProfile, lazy: page(() => import('../pages/register/RegisterProfile')) },
              // 已確認（#12） L3：進度查詢以信箱＋手機查詢、不另出稿（見 api/register.ts queryProgress）
              {
                path: PATHS.progress,
                lazy: pageWith(() => import('../pages/GuestPlaceholder'), { title: '進度查詢' }),
              },
            ],
          },
          // Line 登入導回：只顯示 loading 遮罩，不套卡片版型
          { path: PATHS.lineCallback, lazy: page(() => import('../pages/login/LineCallback')) },
          // 註冊結果頁：整頁置中、無卡片
          { path: PATHS.registerDone, lazy: page(() => import('../pages/register/RegisterDone')) },
          { path: PATHS.registerLine, lazy: page(() => import('../pages/register/RegisterLineSuccess')) },
          { path: PATHS.forgotPasswordDone, lazy: page(() => import('../pages/forgot-password/ForgotPasswordDone')) },
        ],
      },
      ...logtoCallbackRoutes,
      ...applyRoutes,
      // 等待審核：登入與否皆可開啟
      { path: PATHS.pending, lazy: page(() => import('../pages/PendingApproval')) },
      // 已登入：未登入 → 登入頁；等待審核中 → 等待審核頁
      {
        element: <RequireAuth />,
        children: [
          {
            element: <MemberLayout />,
            children: [
              { path: PATHS.home, lazy: page(() => import('../pages/Home')) },
              { path: PATHS.profile, lazy: page(() => import('../pages/profile/Profile')) },
              { path: PATHS.profileEdit, lazy: page(() => import('../pages/profile/ProfileEdit')) },
              { path: PATHS.changePassword, lazy: page(() => import('../pages/ChangePassword')) },
              { path: PATHS.receipt, lazy: page(() => import('../pages/receipt/ReceiptDownload')) },
              // 區長以上；權限不足 → 403
              {
                element: <RequireRole minRole="leader" />,
                children: [
                  { path: PATHS.memberReview, lazy: page(() => import('../pages/member-review/MemberReview')) },
                  // TODO(#12)：系統設定的功能與可見角色待確認
                  {
                    path: PATHS.settings,
                    lazy: pageWith(() => import('../pages/MemberPlaceholder'), { title: '系統設定' }),
                  },
                ],
              },
              { path: PATHS.forbidden, lazy: page(() => import('../pages/Forbidden')) },
              { path: '*', lazy: page(() => import('../pages/NotFound')) },
            ],
          },
        ],
      },
    ],
  },
])
