// 社群登入（Line、Google，#58）的流程：按鈕（components/SocialButtons.tsx）→ 社群平台授權 → 導回頁（pages/SocialCallback.tsx）。
// 呼叫順序見 src/sso/README.md「社群登入」。
import type { SocialProvider } from '../components/SocialLoginButton'
import { ExperienceError, isExperienceError } from './api/client'
import {
  createSocialAuthorizationUri,
  identify,
  initInteraction,
  submitInteraction,
  updateInteractionEvent,
  verifySocial,
} from './api/experience'
import { socialCallbackUrl } from './paths'

/**
 * Logto 的社群 connector（/api/.well-known/sign-in-exp 的 socialConnectors，2026-10-14 查）。
 * 寫死不在執行時查：按鈕順序、文字照設計稿固定，不必為了兩個 ID 多打一次 API、等它回來才顯示按鈕；
 * ID 只有 IT 在 Logto 後台刪掉重建 connector 時才會變，屆時改這裡（connector 停用時點按鈕會顯示錯誤提示）。
 */
export const SOCIAL_CONNECTORS: ReadonlyArray<{ provider: SocialProvider; connectorId: string }> = [
  { provider: 'line', connectorId: 'f51kym2gm36loxptokqok' },
  { provider: 'google', connectorId: 'uvxuux7ej7b5pc0jx8hcm' },
]

const PROVIDER_NAMES: Record<SocialProvider, string> = { line: 'Line', google: 'Google' }

/** 導回頁標題等用的平台名稱；不認得的 connector 回「社群帳號」 */
export function socialProviderName(connectorId: string | undefined): string {
  const connector = SOCIAL_CONNECTORS.find((c) => c.connectorId === connectorId)
  return connector ? PROVIDER_NAMES[connector.provider] : '社群帳號'
}

/* ---------- 轉址前後的暫存 ---------- */

// 轉址到社群平台會離開這個網頁，verificationId 與 state 要存起來，導回時取出比對
const STORAGE_KEY = 'sso.social'

interface SocialSession {
  connectorId: string
  state: string
  verificationId: string
}

function saveSession(session: SocialSession) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

/** 取出並清掉暫存（只能用一次，避免重新整理導回頁時重複驗證） */
function takeSession(): SocialSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<SocialSession>
    if (typeof parsed.connectorId === 'string' && typeof parsed.state === 'string' && typeof parsed.verificationId === 'string') {
      return parsed as SocialSession
    }
  } catch {
    // 格式不對當作沒有
  }
  return null
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/* ---------- 流程 ---------- */

/** 按下社群登入按鈕：取得授權網址、存下 state 與 verificationId 後轉址到 Line／Google */
export async function startSocialSignIn(connectorId: string) {
  // 社群登入一律從「登入」開始，找不到帳號時導回頁再改成註冊（同 Logto 原本登入頁）
  await initInteraction('SignIn')
  const state = randomState()
  const { verificationId, authorizationUri } = await createSocialAuthorizationUri(connectorId, state, socialCallbackUrl(connectorId))
  saveSession({ connectorId, state, verificationId })
  window.location.assign(authorizationUri)
}

/** 社群帳號缺少的註冊資料（user.missing_profile 的 data.missingProfile），例如 ['email']、['emailOrPhone'] */
export function getMissingProfile(error: unknown): string[] {
  if (!isExperienceError(error, 'user.missing_profile')) return []
  const data = error.data as { missingProfile?: unknown } | undefined
  return Array.isArray(data?.missingProfile) ? data.missingProfile.filter((v): v is string => typeof v === 'string') : []
}

/**
 * 社群平台導回後：比對 state → verifySocial → identify（找不到帳號改成註冊再 identify）→ submit。
 * 成功時回傳要轉去的網址（交給 goToRedirect）；失敗丟 ExperienceError，
 * 前端自訂的錯誤碼為 social_session_invalid、social_cancelled（errors.ts #58）。
 */
export async function completeSocialSignIn(connectorId: string, params: URLSearchParams): Promise<string> {
  const session = takeSession()

  // 使用者在 Line／Google 取消授權：平台會帶 error（例如 access_denied）導回
  if (params.has('error')) throw new ExperienceError(0, 'social_cancelled', params.get('error_description') ?? params.get('error') ?? '')

  if (!session || session.connectorId !== connectorId || !params.get('state') || session.state !== params.get('state')) {
    throw new ExperienceError(0, 'social_session_invalid', 'state mismatch')
  }

  const { verificationId } = await verifySocial(
    connectorId,
    // 同 Logto 原本登入頁：網址參數（code、state 等）之外再帶 redirectUri，部分 connector（如 Google）換 token 時要用
    { ...Object.fromEntries(params), redirectUri: socialCallbackUrl(connectorId) },
    session.verificationId,
  )

  try {
    await identify(verificationId)
  } catch (error) {
    if (!isExperienceError(error, 'user.identity_not_exist')) throw error
    // 沒有用這個社群帳號登入過、也沒有同 email 的帳號可自動連結：改成註冊
    await updateInteractionEvent('Register')
    await identify(verificationId)
  }

  const { redirectTo } = await submitInteraction()
  return redirectTo
}
