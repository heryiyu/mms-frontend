// 登入、登出、Line OAuth
import { authStore } from '../auth/store'
import { get, post } from './client'
import type {
  LineAuthPurpose,
  LineAuthUrlResponse,
  LineCallbackRequest,
  LineCallbackResponse,
  LoginRequest,
  LoginResponse,
} from './types'

/**
 * 登入。成功後會自動寫入 auth store（remember = true 跨瀏覽器關閉保留），
 * 路由守衛 GuestOnly 會自動導回原頁或首頁，頁面不一定要自己導頁。
 * 可能的 ApiError.code：ACCOUNT_NOT_FOUND、WRONG_PASSWORD、TOO_MANY_ATTEMPTS、ACCOUNT_LOCKED、ACCOUNT_PENDING、ACCOUNT_REJECTED
 * ACCOUNT_PENDING 時請導向 PATHS.pending（等待審核頁）。
 */
export async function login(body: LoginRequest, remember = false): Promise<LoginResponse> {
  const res = await post<LoginResponse>('/auth/login', body)
  authStore.setSession({ token: res.token, role: res.role, status: res.status }, remember)
  return res
}

/** 登出：不論 API 成功與否都會清掉本機登入狀態 */
export async function logout(): Promise<void> {
  try {
    await post<void>('/auth/logout')
  } finally {
    authStore.clear()
  }
}

/** 取得 Line OAuth 授權網址（目前後端為 stub） */
export function getLineAuthUrl(purpose: LineAuthPurpose = 'login'): Promise<LineAuthUrlResponse> {
  return get<LineAuthUrlResponse>(`/auth/line/url?purpose=${purpose}`)
}

/** Line 授權後以 code 換登入結果；LOGGED_IN 時會自動寫入 auth store */
export async function lineCallback(body: LineCallbackRequest, remember = false): Promise<LineCallbackResponse> {
  const res = await post<LineCallbackResponse>('/auth/line/callback', body)
  if (res.status === 'LOGGED_IN') {
    authStore.setSession({ token: res.token, role: res.role, status: res.accountStatus }, remember)
  }
  return res
}
