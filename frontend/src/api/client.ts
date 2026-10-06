// 後端 API 呼叫的共用入口：自動帶 token、統一錯誤格式、401 交給外部註冊的 handler 處理。
// 頁面不要直接用 fetch，請呼叫 src/api/*.ts 的 domain 函式。
// 注意：這個檔案不可 import router 或 React（避免循環相依），導回登入頁由 setUnauthorizedHandler 注入。
import { clearToken, getToken } from './token'
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
 * 註冊 401 處理函式（通常在 router 建好後呼叫一次，導向登入頁）。
 * client 會先清掉本機 token 再呼叫它；handler 要自行避免在登入頁重複導向。
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

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body != null && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const token = getToken()
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)

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
    if (res.status === 401) {
      clearToken()
      unauthorizedHandler?.(error)
    }
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
