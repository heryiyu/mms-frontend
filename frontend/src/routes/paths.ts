// 所有路由路徑集中在這裡，頁面導頁請用 PATHS.xxx，不要手寫字串。
import type { AccountStatus } from '../api/types'

export const PATHS = {
  /* 未登入 */
  login: '/login',
  register: '/register',
  /** 註冊：個資保護聲明 */
  registerPrivacy: '/register/privacy',
  /** 註冊：會員資料輸入（全寬表單） */
  registerProfile: '/register/profile',
  /** 註冊：送出完成「等待核准中」 */
  registerDone: '/register/done',
  /** 註冊：Line 授權成功「Line創建成功」，自動跳轉接回一般流程 */
  registerLine: '/register/line',
  /** 忘記密碼：信箱＋手機 → OTP → 設定新密碼（同頁切換步驟） */
  forgotPassword: '/forgot-password',
  /** 忘記密碼：「變更完成！」（整頁置中、無卡片） */
  forgotPasswordDone: '/forgot-password/done',
  /** 審核進度查詢（登入頁「進度查詢」；已確認不另出稿，#12 L3）：email 或手機擇一＋驗證碼（#52） */
  progress: '/progress',
  /** 審核進度查詢結果（整頁置中、無卡片） */
  progressResult: '/progress/result',
  /** Line OAuth 授權完成後的導回頁（需與後端設定的 redirect URI 一致，TODO(#12)） */
  lineCallback: '/auth/line/callback',
  /** 等待審核（帳號尚未核准）；登入回 ACCOUNT_PENDING 時導到這裡 */
  pending: '/pending',
  /** Logto 登入完成後的導回頁（Logto 模式，#44）；需在 Logto 登記為 redirect URI */
  signInCallback: '/callback',

  /* 已登入 SSO、還沒有會員資料（Logto 模式，#48）：出生／補填聯絡方式 → 個資聲明 → 會員資料 → 等待核准中 */
  apply: '/apply',
  applyPrivacy: '/apply/privacy',
  applyProfile: '/apply/profile',
  /** 申請被退回：顯示退回原因，可修改後重新送出 */
  applyRejected: '/apply/rejected',

  /* 已登入 */
  home: '/',
  profile: '/profile',
  /** 個人資訊修改（修改 → OTP 驗證 → 變更完成） */
  profileEdit: '/profile/edit',
  changePassword: '/change-password',
  receipt: '/receipt',
  /** 奉獻收據下載頁（#50）：簡訊寄的網址，要登入、只有本人、1 小時內有效。實際網址用 receiptDownloadPath(id) */
  receiptDownload: '/receipt/download/:id',
  /** 區長以上 */
  memberReview: '/member-review',
  /** 區長以上（暫定，TODO(#12) 見 layouts/memberNav.ts） */
  settings: '/settings',
  /** 權限不足 */
  forbidden: '/403',

  /* 開發用（只在 dev 模式註冊，見 routes/index.tsx） */
  /** OTP 元件示範（issue #5） */
  devOtp: '/dev/otp',
} as const

/** 奉獻收據下載頁網址（#50）：/receipt/download/<id> */
export const receiptDownloadPath = (id: string) => `/receipt/download/${encodeURIComponent(id)}`

/** 路由守衛導向登入頁時放在 location.state，登入後導回原頁 */
export interface LoginRedirectState {
  from?: { pathname: string; search?: string; hash?: string }
}

const GUEST_PATHS: string[] = [
  PATHS.login,
  PATHS.register,
  PATHS.registerPrivacy,
  PATHS.registerProfile,
  PATHS.registerDone,
  PATHS.registerLine,
  PATHS.forgotPassword,
  PATHS.forgotPasswordDone,
  PATHS.progress,
  PATHS.progressResult,
  PATHS.lineCallback,
  PATHS.pending,
  PATHS.signInCallback,
  PATHS.apply,
  PATHS.applyPrivacy,
  PATHS.applyProfile,
  PATHS.applyRejected,
]

/** 登入後要去的頁面：location.state.from（被守衛擋下的原頁），沒有則回首頁 */
export function getPostLoginPath(state: unknown): string {
  const from = (state as LoginRedirectState | null)?.from
  if (!from || typeof from.pathname !== 'string' || GUEST_PATHS.includes(from.pathname)) return PATHS.home
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
}

/**
 * 帳號狀態不是 ACTIVE 時要去的頁面（路由守衛、Logto 登入完成時共用）：
 * 待審核 → 等待審核頁；還沒填會員資料 → 會員資料填寫流程；被退回 → 退回原因頁（#48）
 */
export const STATUS_PATHS: Record<Exclude<AccountStatus, 'ACTIVE'>, string> = {
  PENDING: PATHS.pending,
  UNREGISTERED: PATHS.apply,
  REJECTED: PATHS.applyRejected,
}
