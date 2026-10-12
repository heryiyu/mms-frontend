// 登入、登出、Line OAuth、Logto 登入完成（#44）
// Logto 模式與本機模式的差異見 src/auth/logto.ts。
import * as logto from '../auth/logto'
import { authStore } from '../auth/store'
import type { LoginRedirectState } from '../routes/paths'
import { get, post } from './client'
import type {
  AuthSessionResponse,
  LineAuthPurpose,
  LineAuthUrlResponse,
  LineCallbackRequest,
  LineCallbackResponse,
  LoginRequest,
  LoginResponse,
} from './types'

/**
 * 登入（本機模式）。成功後會自動寫入 auth store（remember = true 跨瀏覽器關閉保留），
 * 路由守衛 GuestOnly 會自動導回原頁或首頁，頁面不一定要自己導頁。
 * 可能的 ApiError.code：ACCOUNT_NOT_FOUND、WRONG_PASSWORD、TOO_MANY_ATTEMPTS、ACCOUNT_LOCKED、ACCOUNT_PENDING、ACCOUNT_REJECTED
 * ACCOUNT_PENDING 時請導向 PATHS.pending（等待審核頁）。
 */
export async function login(body: LoginRequest, remember = false): Promise<LoginResponse> {
  const res = await post<LoginResponse>('/auth/login', body)
  authStore.setSession({ id: res.token, token: res.token, role: res.role, status: res.status }, remember)
  return res
}

/**
 * Logto 導回 callback 頁後呼叫：以 code 換 token，再向後端取得角色與帳號狀態寫入 auth store。
 * Logto 的 refresh token 存在 localStorage（關閉瀏覽器仍有效），登入狀態跟著存 localStorage。
 * 可能的 ApiError.code：ACCOUNT_REJECTED、MEMBER_NOT_FOUND（尚未建立會員資料）；Logto 換 token 失敗則丟 SDK 的錯誤。
 */
export async function completeLogtoSignIn(callbackUrl: string): Promise<AuthSessionResponse> {
  const id = await logto.handleSignInCallback(callbackUrl)
  const res = await get<AuthSessionResponse>('/auth/session')
  authStore.setSession({ id, role: res.role, status: res.status }, true)
  return res
}

export interface LogoutOptions {
  /** 重新登入後要回到的頁面（閒置登出）。本機模式由 RequireAuth 自動記住原頁，不需要傳 */
  from?: LoginRedirectState['from']
}

/**
 * 登出：不論成功與否都會清掉本機登入狀態。
 * Logto 模式會結束 Logto session 並轉址（頁面即將離開，之後回到登入頁）；
 * 若只清本機狀態，回登入頁時 Logto 會直接放行、等於沒登出。
 */
export async function logout({ from }: LogoutOptions = {}): Promise<void> {
  if (logto.isLogtoEnabled) {
    try {
      await logto.signOut(from)
    } finally {
      authStore.clear()
    }
    return
  }
  try {
    await post<void>('/auth/logout')
  } finally {
    authStore.clear()
  }
}

/** 取得 Line OAuth 授權網址（本機模式；目前後端為 stub） */
export function getLineAuthUrl(purpose: LineAuthPurpose = 'login'): Promise<LineAuthUrlResponse> {
  return get<LineAuthUrlResponse>(`/auth/line/url?purpose=${purpose}`)
}

/** Line 授權後以 code 換登入結果（本機模式）；LOGGED_IN 時會自動寫入 auth store */
export async function lineCallback(body: LineCallbackRequest, remember = false): Promise<LineCallbackResponse> {
  const res = await post<LineCallbackResponse>('/auth/line/callback', body)
  if (res.status === 'LOGGED_IN') {
    authStore.setSession({ id: res.token, token: res.token, role: res.role, status: res.accountStatus }, remember)
  }
  return res
}
