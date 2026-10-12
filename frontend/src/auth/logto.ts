// Logto（NLC SSO）OIDC client（#44）。
// - 設定 VITE_LOGTO_ENDPOINT 與 VITE_LOGTO_APP_ID 時為「Logto 模式」：登入、註冊、忘記密碼都轉址到 Logto 登入頁，
//   API 帶 Logto 發的 access token。沒設定時為「本機模式」：沿用登入頁＋後端 /auth/login（開發時搭配 MSW 假資料）。
// - token（含 refresh token）由 SDK 存在 localStorage 並自動更新；角色與帳號狀態仍存在 auth store（src/auth/store.ts）。
// - api/client.ts 會 import 這個檔案，不可 import React、router 或 src/api（避免循環相依）。
import LogtoClient, { type SignInOptions } from '@logto/browser'
import { type LoginRedirectState, PATHS } from '../routes/paths'
import { authStore } from './store'

const endpoint: string | undefined = import.meta.env.VITE_LOGTO_ENDPOINT || undefined
const appId: string | undefined = import.meta.env.VITE_LOGTO_APP_ID || undefined
/** 後端 API 的 Logto API resource；有設定才拿得到 JWT 格式的 access token */
const resource: string | undefined = import.meta.env.VITE_LOGTO_RESOURCE || undefined
/** 空白分隔；openid、offline_access、profile 由 SDK 自動加上 */
const scopes: string[] = String(import.meta.env.VITE_LOGTO_SCOPES ?? '')
  .split(/\s+/)
  .filter(Boolean)

const client = endpoint && appId ? new LogtoClient({ endpoint, appId, scopes, resources: resource ? [resource] : [] }) : null

export const isLogtoEnabled = client !== null

function requireClient(): LogtoClient {
  if (!client) throw new Error('Logto 未設定（VITE_LOGTO_ENDPOINT、VITE_LOGTO_APP_ID）')
  return client
}

const toAbsoluteUrl = (path: string) => new URL(path, window.location.origin).href

/* ---------- 登入後要回到的頁面 ---------- */

// 轉址到 Logto 會離開本站，location.state 帶不回來，改存 sessionStorage（同分頁有效）
const POST_LOGIN_KEY = 'nlc_mms_post_login_from'

function savePostLoginFrom(from: LoginRedirectState['from'] | undefined) {
  try {
    if (from) window.sessionStorage.setItem(POST_LOGIN_KEY, JSON.stringify(from))
    else window.sessionStorage.removeItem(POST_LOGIN_KEY)
  } catch {
    // storage 不可用時登入後一律回首頁
  }
}

/** 取出並清除登入前記下的原頁（交給 getPostLoginPath 檢查） */
export function consumePostLoginFrom(): LoginRedirectState['from'] | undefined {
  try {
    const raw = window.sessionStorage.getItem(POST_LOGIN_KEY)
    window.sessionStorage.removeItem(POST_LOGIN_KEY)
    return raw ? (JSON.parse(raw) as LoginRedirectState['from']) : undefined
  } catch {
    return undefined
  }
}

/* ---------- 轉址 ---------- */

// 已經開始轉址（signIn／signOut）：頁面即將離開，期間守衛導到登入頁也不要再發起一次轉址
let redirecting = false

// 從 Logto 頁按上一頁回來時，頁面可能由 bfcache 原樣還原，要允許重新轉址
window.addEventListener('pageshow', (event) => {
  if (event.persisted) redirecting = false
})

// 自動轉址的防呆：後端一直回 401 時會變成「登入頁 → Logto（已有 session 直接放行）→ callback → 401 → 登入頁」無限迴圈。
// 距離上次自動轉址太近就不再自動轉，改由使用者手動按鈕。
const AUTO_SIGN_IN_KEY = 'nlc_mms_auto_sign_in_at'
const AUTO_SIGN_IN_INTERVAL_MS = 15_000

function canAutoSignIn(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(AUTO_SIGN_IN_KEY))
    const now = Date.now()
    if (Number.isFinite(last) && now - last < AUTO_SIGN_IN_INTERVAL_MS) return false
    window.sessionStorage.setItem(AUTO_SIGN_IN_KEY, String(now))
    return true
  } catch {
    // 無法記錄就無法偵測迴圈，保守起見改為手動
    return false
  }
}

export type LogtoFirstScreen = NonNullable<SignInOptions['firstScreen']>

export interface StartSignInOptions {
  /** 登入後要回到的頁面（守衛擋下的原頁）；未傳則沿用先前記下的值（例如閒置登出前的頁面） */
  from?: LoginRedirectState['from']
  /** Logto 登入頁一開始顯示的畫面：註冊（register）、忘記密碼（reset_password） */
  firstScreen?: LogtoFirstScreen
  /** 進入頁面時自動轉址（受迴圈防呆限制）；使用者按按鈕時不傳 */
  auto?: boolean
}

/**
 * 轉址到 Logto 登入頁。
 * 回傳 'redirecting'：已開始轉址（或先前已開始），頁面即將離開；'blocked'：自動轉址被防呆擋下，請顯示手動按鈕。
 */
export async function startSignIn({ from, firstScreen, auto }: StartSignInOptions = {}): Promise<'redirecting' | 'blocked'> {
  if (redirecting) return 'redirecting'
  if (auto && !canAutoSignIn()) return 'blocked'
  if (from) savePostLoginFrom(from)
  redirecting = true
  try {
    await requireClient().signIn({ redirectUri: toAbsoluteUrl(PATHS.signInCallback), firstScreen })
  } catch (error) {
    redirecting = false
    throw error
  }
  return 'redirecting'
}

/** Logto 導回 callback 頁：以 code 換 token，回傳 Logto 使用者 ID（sub） */
export async function handleSignInCallback(callbackUrl: string): Promise<string> {
  const logto = requireClient()
  await logto.handleSignInCallback(callbackUrl)
  return (await logto.getIdTokenClaims()).sub
}

/**
 * 結束 Logto session 並轉址到 Logto 登出端點，之後回到登入頁。
 * from：重新登入後要回到的頁面（閒置登出）；未傳 = 一般登出，登入後回首頁。
 */
export async function signOut(from?: LoginRedirectState['from']): Promise<void> {
  savePostLoginFrom(from)
  redirecting = true
  try {
    await requireClient().signOut(toAbsoluteUrl(PATHS.login))
  } catch (error) {
    redirecting = false
    throw error
  }
}

/* ---------- token ---------- */

/** 呼叫 API 用的 access token；未登入 Logto 回 null。refresh token 失效等無法更新時會丟出錯誤，呼叫端視為登入失效 */
export async function getAccessToken(): Promise<string | null> {
  const logto = requireClient()
  if (!(await logto.isAuthenticated())) return null
  return logto.getAccessToken(resource)
}

/** 只清掉本機的 Logto token（不結束 Logto session、不轉址），例如 API 回 401 時 */
export async function clearTokens(): Promise<void> {
  await client?.clearAllTokens()
}

/**
 * App 啟動時呼叫：Logto 模式下，auth store 有登入狀態但 Logto token 已不在（清過 storage、另一分頁登出），
 * 或是本機模式留下的登入狀態，都視為未登入。
 */
export async function syncSessionWithLogto(): Promise<void> {
  const session = authStore.getSession()
  if (!client || !session) return
  if (session.token || !(await client.isAuthenticated())) authStore.clear()
}
