// 後端 API 呼叫的共用入口：自動帶 token、統一錯誤格式、401 交給外部註冊的 handler 處理。
// 頁面不要直接用 fetch，請呼叫 src/api/*.ts 的 domain 函式。
// 注意：這個檔案不可 import router 或 React（避免循環相依）。401 時清除 auth store，路由守衛會自動導回登入頁；
// 需要額外處理（例如提示「登入已失效」）再用 setUnauthorizedHandler 注入。
// token：Logto 模式向 Logto SDK 取得（過期會自動更新），本機模式用 auth store 保存的後端 token（src/auth/logto.ts）。
import * as logto from '../auth/logto'
import { authStore } from '../auth/store'
import type { ApiErrorBody, ErrorCode } from './types'

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  /** HTTP status；連線失敗時為 0 */
  status: number
  code: ErrorCode
  /** 後端回應 body（解析後的 JSON），可能是 undefined */
  data: unknown

  constructor(status: number, code: ErrorCode, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

/** 判斷是否為 ApiError，可選擇指定 code */
export function isApiError(error: unknown, code?: ErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code)
}

type UnauthorizedHandler = (error: ApiError) => void
let unauthorizedHandler: UnauthorizedHandler | null = null

/**
 * 註冊額外的 401 處理函式（導回登入頁已由路由守衛處理，這裡只需做額外提示等）。
 * client 會先清掉 auth store 再呼叫它。
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

function fallbackCode(status: number): ErrorCode {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  return 'UNKNOWN'
}

function toApiError(status: number, body: unknown): ApiError {
  const parsed = (typeof body === 'object' && body !== null ? body : {}) as Partial<ApiErrorBody>
  const code = typeof parsed.code === 'string' ? parsed.code : fallbackCode(status)
  const message = typeof parsed.message === 'string' ? parsed.message : `API ${status}`
  return new ApiError(status, code, message, body)
}

/** 登入失效：清掉本機登入狀態（守衛會導回登入頁），再交給外部 handler */
function handleUnauthorized(error: ApiError) {
  authStore.clear()
  if (logto.isLogtoEnabled) void logto.clearTokens().catch(() => {})
  unauthorizedHandler?.(error)
}

async function getAccessToken(): Promise<string | null> {
  if (!logto.isLogtoEnabled) return authStore.getToken()
  try {
    return await logto.getAccessToken()
  } catch (cause) {
    // 連不到 Logto（離線）時不登出，照一般連線錯誤處理
    if (cause instanceof TypeError) throw new ApiError(0, 'NETWORK_ERROR', '網路連線異常，請稍後再試')
    // refresh token 過期或被撤銷，無法更新 access token
    const error = new ApiError(401, 'UNAUTHORIZED', '登入已失效，請重新登入')
    handleUnauthorized(error)
    throw error
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body != null && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (!headers.has('Authorization')) {
    const token = await getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch (error) {
    // 呼叫端主動 abort 時照原樣丟出，不當成連線錯誤
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'NETWORK_ERROR', '網路連線異常，請稍後再試')
  }

  const data = res.status === 204 ? undefined : await res.json().catch(() => undefined)

  if (!res.ok) {
    const error = toApiError(res.status, data)
    if (res.status === 401) handleUnauthorized(error)
    throw error
  }
  return data as T
}

function withBody(method: string, body: unknown, init: RequestInit): RequestInit {
  return { ...init, method, body: body === undefined ? undefined : JSON.stringify(body) }
}

export const get = <T>(path: string, init: RequestInit = {}) => request<T>(path, { ...init, method: 'GET' })
export const post = <T>(path: string, body?: unknown, init: RequestInit = {}) =>
  request<T>(path, withBody('POST', body, init))
export const put = <T>(path: string, body?: unknown, init: RequestInit = {}) =>
  request<T>(path, withBody('PUT', body, init))
export const patch = <T>(path: string, body?: unknown, init: RequestInit = {}) =>
  request<T>(path, withBody('PATCH', body, init))
export const del = <T>(path: string, init: RequestInit = {}) => request<T>(path, { ...init, method: 'DELETE' })

/**
 * 錯誤彈窗的內文：後端有給錯誤碼時用後端訊息；沒給 code（例如 5xx）時不顯示「API 502」這類技術訊息，改用 fallback。
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  return isApiError(error) && error.code !== 'UNKNOWN' ? error.message : fallback
}

/** 後端 422 VALIDATION_ERROR 的欄位錯誤（body 為 { fields: { email: '…' } }）；其他錯誤回空物件 */
export function getValidationFields(error: unknown): Record<string, string> {
  if (!isApiError(error, 'VALIDATION_ERROR')) return {}
  return (error.data as { fields?: Record<string, string> } | undefined)?.fields ?? {}
}
