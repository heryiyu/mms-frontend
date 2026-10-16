// 第三方 App 的授權同意頁（/consent，#74）用的 API。Logto 1.42.0 這頁還在舊的 Interaction API（/api/interaction/consent），
// 不在 Experience API 裡；格式照 @logto/schemas 的 ConsentInfoResponse 與 Logto 原登入頁 packages/experience/src/apis/consent.ts。
import { request } from './client'

/** App 要求、但使用者還沒授權過的 API resource 權限 */
export interface MissingResourceScopes {
  resource: { id: string; name: string; indicator: string }
  scopes: { id: string; name: string; description: string | null }[]
}

export interface ConsentInfo {
  application: {
    id: string
    name: string
    /** Logto 後台 App「品牌」設定的顯示名稱，有設就優先用 */
    displayName?: string | null
    termsOfUseUrl?: string | null
    privacyPolicyUrl?: string | null
    branding?: { logoUrl?: string; darkLogoUrl?: string } | null
  }
  user: {
    id: string
    name: string | null
    avatar: string | null
    username: string | null
    primaryEmail: string | null
    primaryPhone: string | null
  }
  /** App 要求組織權限時才有 */
  organizations?: { id: string; name: string; missingResourceScopes?: MissingResourceScopes[] }[]
  /** 還沒授權過的 OIDC scope（profile、email、phone…） */
  missingOIDCScope?: string[]
  missingResourceScopes?: MissingResourceScopes[]
  /** App 的導回網址（裝置授權流程沒有） */
  redirectUri?: string
}

/** 取得同意頁要顯示的資料；沒有進行中的登入時回 session.not_found */
export const getConsentInfo = () => request<ConsentInfo>('GET', '/api/interaction/consent')

/**
 * 按「授權」：回傳的 redirectTo 交給 goToRedirect（回到 Logto 繼續 OIDC 流程，最後導回 App）。
 * 帳號沒有使用這個 App 的權限時回 oidc.access_denied。
 */
export const consent = (organizationId?: string) =>
  request<{ redirectTo: string }>('POST', '/api/interaction/consent', {
    organizationIds: organizationId ? [organizationId] : undefined,
  })
