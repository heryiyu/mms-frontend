// Logto Experience API（/api/experience/*）。規格：https://sso.newlife.org.tw/api/.well-known/experience.openapi.json
// 這裡只包薄薄一層，各流程（登入、註冊、忘記密碼、社群登入）的呼叫順序寫在頁面或流程檔，常見順序見 src/sso/README.md。
import { request } from './client'

export type InteractionEvent = 'SignIn' | 'Register' | 'ForgotPassword'

/** 登入／註冊用的帳號：email 或手機（手機為含國碼的純數字，例如 886912345678） */
export type Identifier = { type: 'email'; value: string } | { type: 'phone'; value: string }

interface VerificationResult {
  verificationId: string
}

/** 開始一次新的登入／註冊／忘記密碼（會清掉這次 interaction 先前的驗證紀錄） */
export const initInteraction = (interactionEvent: InteractionEvent) =>
  request<void>('PUT', '/api/experience', { interactionEvent })

/** 切換登入／註冊（例如社群登入找不到帳號時改成註冊）；ForgotPassword 不能互換 */
export const updateInteractionEvent = (interactionEvent: Exclude<InteractionEvent, 'ForgotPassword'>) =>
  request<void>('PUT', '/api/experience/interaction-event', { interactionEvent })

/** 目前 interaction 的公開資料（除錯或判斷流程進度用） */
export const getInteraction = () =>
  request<{ interactionEvent: InteractionEvent; profile: Record<string, unknown> }>('GET', '/api/experience/interaction')

/* ---------- 驗證 ---------- */

/** 帳號＋密碼驗證；帳號不存在與密碼錯誤都回 session.invalid_credentials */
export const verifyPassword = (identifier: Identifier, password: string) =>
  request<VerificationResult>('POST', '/api/experience/verification/password', { identifier, password })

/** 寄送驗證碼（email 或簡訊），回傳的 verificationId 給 verifyCode 用 */
export const sendVerificationCode = (identifier: Identifier, interactionEvent: InteractionEvent) =>
  request<VerificationResult>('POST', '/api/experience/verification/verification-code', { identifier, interactionEvent })

/** 驗證驗證碼；identifier 必須和寄送時相同 */
export const verifyCode = (identifier: Identifier, verificationId: string, code: string) =>
  request<VerificationResult>('POST', '/api/experience/verification/verification-code/verify', {
    identifier,
    verificationId,
    code,
  })

/** 社群登入第一步：取得要轉址過去的授權網址。redirectUri 為本站的 /callback/:connectorId */
export const createSocialAuthorizationUri = (connectorId: string, state: string, redirectUri: string) =>
  request<VerificationResult & { authorizationUri: string }>(
    'POST',
    `/api/experience/verification/social/${encodeURIComponent(connectorId)}/authorization-uri`,
    { state, redirectUri },
  )

/** 社群登入第二步：把社群平台導回時網址上的參數（code、state 等）交給 Logto 驗證 */
export const verifySocial = (connectorId: string, connectorData: Record<string, unknown>, verificationId?: string) =>
  request<VerificationResult>('POST', `/api/experience/verification/social/${encodeURIComponent(connectorId)}/verify`, {
    connectorData,
    verificationId,
  })

/* ---------- 識別、補資料、送出 ---------- */

/**
 * 以驗證紀錄識別使用者。登入／忘記密碼：找出帳號；註冊：建立帳號（缺資料時回 user.missing_profile，
 * error.data.missingProfile 列出缺的欄位，補完再呼叫一次）。
 */
export const identify = (verificationId?: string, options: { linkSocialIdentity?: boolean } = {}) =>
  request<void>('POST', '/api/experience/identification', { verificationId, ...options })

export type ProfileInput =
  | { type: 'password'; value: string }
  | { type: 'email' | 'phone' | 'social'; verificationId: string }
  | { type: 'extraProfile'; values: Record<string, unknown> }

/** 補上註冊所需的資料（密碼、已驗證的 email／手機、自訂欄位如姓名） */
export const addProfile = (profile: ProfileInput) => request<void>('POST', '/api/experience/profile', profile)

/** 忘記密碼：識別使用者後設定新密碼 */
export const resetPassword = (password: string) => request<void>('PUT', '/api/experience/profile/password', { password })

/** 完成 interaction；回傳的 redirectTo 交給 goToRedirect 轉址（回到 Logto 繼續 OIDC 流程，最後導回原網站） */
export const submitInteraction = () => request<{ redirectTo: string }>('POST', '/api/experience/submit')

/* ---------- 轉址 ---------- */

// 開發時登入頁跑在 localhost、Logto 在 proxy 後面：Logto 回的完整網址要改成本機路徑，cookie 才帶得到
const devSsoOrigin = import.meta.env.DEV ? new URL(import.meta.env.VITE_SSO_PROXY_TARGET || 'https://sso.newlife.org.tw').origin : null

export function goToRedirect(redirectTo: string) {
  const url = new URL(redirectTo, window.location.origin)
  if (devSsoOrigin && url.origin === devSsoOrigin) {
    window.location.assign(url.pathname + url.search + url.hash)
    return
  }
  window.location.assign(url.href)
}
