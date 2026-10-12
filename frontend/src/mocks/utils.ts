// MSW handler 共用工具：路徑、延遲、錯誤回應、驗證 token／OTP／欄位。
// 驗證失敗一律 throw Response（MSW 會直接當成回應），handler 內可以用直線流程撰寫。
import { delay, HttpResponse } from 'msw'
import { API_BASE_URL } from '../api/client'
import { getPasswordRuleError } from '../constants/password'
import { PHONE_PATTERN } from '../constants/validation'
import type { ErrorCode, Role } from '../api/types'
import { db, findUserByEmail, normalizeEmail, type MockUser } from './db'

export const api = (path: string) => `${API_BASE_URL}${path}`

/** 模擬後端延遲（預設 400–800ms），讓前端的 loading 狀態看得到 */
export const mockDelay = (min = 400, max = 800) => delay(min + Math.random() * (max - min))

/* ---------- 錯誤回應 ---------- */

type ServerErrorCode = Exclude<ErrorCode, 'NETWORK_ERROR' | 'UNKNOWN'>

const ERRORS: Record<ServerErrorCode, { status: number; message: string }> = {
  ACCOUNT_NOT_FOUND: { status: 404, message: '查無此帳號' },
  WRONG_PASSWORD: { status: 400, message: '密碼輸入錯誤' },
  TOO_MANY_ATTEMPTS: { status: 429, message: '操作過度頻繁，請稍後再試' },
  ACCOUNT_LOCKED: { status: 423, message: '登入過度頻繁，帳號已鎖定，請聯繫教會' },
  ACCOUNT_PENDING: { status: 403, message: '帳號尚未核准，審核中' },
  ACCOUNT_REJECTED: { status: 403, message: '申請未通過審核，請聯繫教會' },
  OTP_INVALID: { status: 400, message: '驗證碼錯誤' },
  OTP_EXPIRED: { status: 410, message: '驗證碼已逾時，請重新發送' },
  TOKEN_INVALID: { status: 400, message: '驗證已失效，請重新操作' },
  EMAIL_PHONE_MISMATCH: { status: 400, message: '信箱與手機不符' },
  ALREADY_REGISTERED: { status: 409, message: '此信箱、手機或身分證字號已被使用' },
  WRONG_CURRENT_PASSWORD: { status: 400, message: '目前密碼錯誤' },
  PASSWORD_SAME_AS_OLD: { status: 400, message: '新密碼不可與舊密碼相同' },
  NO_RECORDS: { status: 404, message: '該年度無奉獻紀錄' },
  MEMBER_NOT_FOUND: { status: 404, message: '查無此申請' },
  ALREADY_PROCESSED: { status: 409, message: '此申請已處理' },
  VALIDATION_ERROR: { status: 422, message: '欄位格式錯誤' },
  FORBIDDEN: { status: 403, message: '沒有權限執行此操作' },
  UNAUTHORIZED: { status: 401, message: '登入已失效，請重新登入' },
}

export function errorResponse(code: ServerErrorCode, message?: string, fields?: Record<string, string>) {
  const { status, message: defaultMessage } = ERRORS[code]
  return HttpResponse.json({ code, message: message ?? defaultMessage, ...(fields ? { fields } : {}) }, { status })
}

export const noContent = () => new HttpResponse(null, { status: 204 })

/* ---------- 請求內容 ---------- */

/** 讀取 JSON body；required 內的欄位缺漏或為空字串時丟 VALIDATION_ERROR */
export async function readBody<T extends object>(request: Request, required: (keyof T & string)[] = []): Promise<T> {
  const body = (await request.json().catch(() => ({}))) as Partial<T>
  const missing = required.filter((key) => body[key] === undefined || body[key] === null || body[key] === '')
  if (missing.length > 0) {
    throw errorResponse('VALIDATION_ERROR', undefined, Object.fromEntries(missing.map((key) => [key, '必填'])))
  }
  return body as T
}

/* ---------- 驗證 ---------- */

const TOKEN_PREFIX = 'mock-token-'

export const makeToken = (user: MockUser) => `${TOKEN_PREFIX}${user.id}`

/**
 * Logto 模式（#44）：Logto 發的 access token（JWT）沒有對應的測試帳號，一律視為這個信箱的帳號。
 * 在 .env.local 設 VITE_MOCK_LOGTO_EMAIL 可切換，例如 pending@test.com（等待審核）、notfound@test.com（尚未建立會員資料）。
 */
const MOCK_LOGTO_EMAIL: string = import.meta.env.VITE_MOCK_LOGTO_EMAIL || 'member@test.com'

export const readBearer = (request: Request) => {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
}

/** 是否為 Logto 發的 JWT（header.payload.signature） */
export const isLogtoToken = (token: string) => token.split('.').length === 3

/** 依 token 找測試帳號（不看帳號狀態）；找不到回 undefined */
export function findUserByToken(token: string): MockUser | undefined {
  if (token.startsWith(TOKEN_PREFIX)) return db.users.find((u) => u.id === token.slice(TOKEN_PREFIX.length))
  if (isLogtoToken(token)) return findUserByEmail(MOCK_LOGTO_EMAIL)
  return undefined
}

/** 從 Authorization: Bearer 取出登入者；token 無效回 401，role 不符回 403 */
export function requireUser(request: Request, role?: Role): MockUser {
  const user = findUserByToken(readBearer(request))
  if (!user || user.status !== 'ACTIVE') throw errorResponse('UNAUTHORIZED')
  if (role && user.role !== role) throw errorResponse('FORBIDDEN')
  return user
}

export const randomToken = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

/** 這個信箱一律視為「操作過度頻繁」，用來測 TOO_MANY_ATTEMPTS */
export const RATE_LIMITED_EMAIL = 'frequent@test.com'

export function assertNotRateLimited(email: string) {
  if (normalizeEmail(email) === RATE_LIMITED_EMAIL) throw errorResponse('TOO_MANY_ATTEMPTS')
}

/** OTP：4 碼數字；0000 → 驗證碼錯誤，9999 → 驗證碼逾時，其餘皆通過 */
export const OTP_LENGTH = 4
export const OTP_EXPIRES_IN = 300

export function assertOtp(otp: string) {
  if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp) || otp === '0000') throw errorResponse('OTP_INVALID')
  if (otp === '9999') throw errorResponse('OTP_EXPIRED')
}

export const otpResponse = () => HttpResponse.json({ expiresIn: OTP_EXPIRES_IN, length: OTP_LENGTH })

/** 密碼規則與前端表單共用 src/constants/password.ts（設計未定，暫定至少 8 碼且含英文與數字） */
export function assertPassword(password: string, field = 'password') {
  const message = getPasswordRuleError(password)
  if (message) throw errorResponse('VALIDATION_ERROR', message, { [field]: message })
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 手機格式與前端表單共用 src/constants/validation.ts */
export function assertEmailPhone(email: string, phone: string) {
  const fields: Record<string, string> = {}
  if (!EMAIL_PATTERN.test(email)) fields.email = '信箱格式錯誤'
  if (!PHONE_PATTERN.test(phone)) fields.phone = '手機格式錯誤'
  if (Object.keys(fields).length > 0) throw errorResponse('VALIDATION_ERROR', undefined, fields)
}
