// 登入、登出、Line OAuth
import { get, post } from './client'
import { clearToken, setToken } from './token'
import type {
  LineAuthPurpose,
  LineAuthUrlResponse,
  LineCallbackRequest,
  LineCallbackResponse,
  LoginRequest,
  LoginResponse,
} from './types'

/**
 * 登入。成功後會自動把 token 存起來（remember = true 存 localStorage，否則 sessionStorage），
 * 頁面只需要依回傳的 role 導頁。
 * 可能的 ApiError.code：ACCOUNT_NOT_FOUND、WRONG_PASSWORD、TOO_MANY_ATTEMPTS、ACCOUNT_LOCKED、ACCOUNT_PENDING、ACCOUNT_REJECTED
 */
export async function login(body: LoginRequest, remember = false): Promise<LoginResponse> {
  const res = await post<LoginResponse>('/auth/login', body)
  setToken(res.token, remember)
  return res
}

/** 登出：不論 API 成功與否都會清掉本機 token */
export async function logout(): Promise<void> {
  try {
    await post<void>('/auth/logout')
  } finally {
    clearToken()
  }
}

/** 取得 Line OAuth 授權網址（目前後端為 stub） */
export function getLineAuthUrl(purpose: LineAuthPurpose = 'login'): Promise<LineAuthUrlResponse> {
  return get<LineAuthUrlResponse>(`/auth/line/url?purpose=${purpose}`)
}

/** Line 授權後以 code 換登入結果；LOGGED_IN 時會自動存 token */
export async function lineCallback(body: LineCallbackRequest, remember = false): Promise<LineCallbackResponse> {
  const res = await post<LineCallbackResponse>('/auth/line/callback', body)
  if (res.status === 'LOGGED_IN') setToken(res.token, remember)
  return res
}
