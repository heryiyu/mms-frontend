// API 錯誤類別與判斷函式。不可 import 登入狀態、Logto SDK（client.ts 會）：
// 共用元件（components/form、components/OtpInput）從這裡 import，SSO 登入頁（src/sso）用到它們時才不會連帶打包 Logto SDK。
import type { ErrorCode } from './types'

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

/** 後端 422 VALIDATION_ERROR 的欄位錯誤（body 為 { fields: { email: '…' } }）；其他錯誤回空物件 */
export function getValidationFields(error: unknown): Record<string, string> {
  if (!isApiError(error, 'VALIDATION_ERROR')) return {}
  return (error.data as { fields?: Record<string, string> } | undefined)?.fields ?? {}
}
