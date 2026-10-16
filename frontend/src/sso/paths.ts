import { PATHS } from '../routes/paths'

// SSO 登入頁的路徑。Logto 會依 /oidc/auth 的參數把使用者導到這些路徑（例如 first_screen=register → /register），
// 所以要和 Logto 原本登入頁的路徑一致，不能自己改名。
// 新增路徑只要改這裡和 routes.tsx：上線時 Logto 把不認得的路徑都回 index.html（logto/README.md），不用改其他設定。
export const SSO_PATHS = {
  signIn: '/sign-in',
  /** first_screen=identifier:sign_in */
  identifierSignIn: '/identifier-sign-in',
  register: '/register',
  /** first_screen=identifier:register */
  identifierRegister: '/identifier-register',
  /** first_screen=reset_password */
  resetPassword: '/reset-password',
  /** Logto 舊登入頁的忘記密碼路徑，導到 resetPassword */
  forgotPassword: '/forgot-password',
  /** 社群平台授權完成導回（要在 Line、Google 後台登記 https://<SSO 網域>/callback/<connectorId>） */
  socialCallback: '/callback/:connectorId',
  /** 第三方 App 的授權同意頁（#74；Logto 在第三方 App 登入完成後導到這裡） */
  consent: '/consent',
  /** Logto 找不到進行中的登入時導到這裡（目前 Logto 設定 unknownSessionRedirectUrl 會直接轉回會員中心） */
  unknownSession: '/unknown-session',
  error: '/error',
} as const

/** 社群登入導回網址（要給 Logto 與社群平台的完整網址） */
export const socialCallbackUrl = (connectorId: string) =>
  new URL(SSO_PATHS.socialCallback.replace(':connectorId', encodeURIComponent(connectorId)), window.location.origin).href

/**
 * 會員中心網址：註冊同意條款、個資聲明、進度查詢等連結，以及登入逾時要回去的地方。
 * TODO(#43)：上線網域待確認（Logto 目前設定的條款網址是 member.newlife.org.tw）。
 */
const MEMBER_CENTER_URL: string =
  import.meta.env.VITE_SSO_MEMBER_CENTER_URL || (import.meta.env.DEV ? 'http://localhost:5173' : 'https://member.newlife.org.tw')

/** 會員中心頁面的完整網址，path 用會員中心 src/routes/paths.ts 的 PATHS */
export const memberCenterUrl = (path: string) => new URL(path, MEMBER_CENTER_URL).href

/**
 * 會員中心登入頁：沒有進行中的登入（session.not_found、直接開 SSO 網址）時回這裡，由會員中心重新發起登入
 * （同 Logto 的 unknownSessionRedirectUrl）
 */
export const MEMBER_CENTER_LOGIN_URL = memberCenterUrl(PATHS.login)
