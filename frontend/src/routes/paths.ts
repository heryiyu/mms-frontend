// 所有路由路徑集中在這裡，頁面導頁請用 PATHS.xxx，不要手寫字串。
export const PATHS = {
  /* 未登入 */
  login: '/login',
  register: '/register',
  /** 註冊：個資保護聲明 */
  registerPrivacy: '/register/privacy',
  /** 註冊：基本資料（尚未實作，TODO(#12)） */
  registerProfile: '/register/profile',
  forgotPassword: '/forgot-password',
  /** 審核進度查詢（登入頁「進度查詢」；設計未畫，目前為佔位頁，TODO(#12)） */
  progress: '/progress',
  /** Line OAuth 授權完成後的導回頁（需與後端設定的 redirect URI 一致，TODO(#12)） */
  lineCallback: '/auth/line/callback',
  /** 等待審核（帳號尚未核准）；登入回 ACCOUNT_PENDING 時導到這裡 */
  pending: '/pending',

  /* 已登入 */
  home: '/',
  profile: '/profile',
  changePassword: '/change-password',
  receipt: '/receipt',
  /** 區長以上 */
  memberReview: '/member-review',
  /** 區長以上（暫定，TODO(#12) 見 layouts/memberNav.ts） */
  settings: '/settings',
  /** 權限不足 */
  forbidden: '/403',
} as const

/** 路由守衛導向登入頁時放在 location.state，登入後導回原頁 */
export interface LoginRedirectState {
  from?: { pathname: string; search?: string; hash?: string }
}

const GUEST_PATHS: string[] = [
  PATHS.login,
  PATHS.register,
  PATHS.registerPrivacy,
  PATHS.registerProfile,
  PATHS.forgotPassword,
  PATHS.progress,
  PATHS.lineCallback,
  PATHS.pending,
]

/** 登入後要去的頁面：location.state.from（被守衛擋下的原頁），沒有則回首頁 */
export function getPostLoginPath(state: unknown): string {
  const from = (state as LoginRedirectState | null)?.from
  if (!from || typeof from.pathname !== 'string' || GUEST_PATHS.includes(from.pathname)) return PATHS.home
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
}
