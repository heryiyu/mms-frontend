// MSW handler 共用工具：路徑、延遲、錯誤回應、驗證 token／OTP／欄位。
// 驗證失敗一律 throw Response（MSW 會直接當成回應），handler 內可以用直線流程撰寫。
import { delay, HttpResponse } from 'msw'
import { API_BASE_URL } from '../api/client'
import { getPasswordRuleError } from '../constants/password'
import { PHONE_PATTERN } from '../constants/validation'
import type { ErrorCode, Role, SsoAccount } from '../api/types'
import { churches, db, districts, ekks, findUserByEmail, groups, journeys, normalizeEmail, type MockUser } from './db'

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

/*
 * Logto 模式（#44、#48）：Logto 發的 access token（JWT）一律視為同一個 SSO 帳號（mockSsoAccount），
 * 再用它的 email／手機對應會員資料（findMemberBySso）。切換方式見 mocks/README.md「Logto 模式」：
 * - .env.local 的 VITE_MOCK_LOGTO_EMAIL（改完要重啟 dev server）
 * - 網址加 ?mockLogto=<信箱>，存在 sessionStorage，經過 SSO 轉址後仍有效，關閉分頁即還原
 */
const MOCK_LOGTO_PARAM = 'mockLogto'
const MOCK_LOGTO_STORAGE_KEY = 'nlc_mms_mock_logto'

// 啟動時讀一次（之後轉址到 SSO、回到 /callback 時網址已經沒有參數）
function readMockLogtoEmail(): string {
  const fallback: string = import.meta.env.VITE_MOCK_LOGTO_EMAIL || 'member@test.com'
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(MOCK_LOGTO_PARAM)
    if (fromUrl) sessionStorage.setItem(MOCK_LOGTO_STORAGE_KEY, fromUrl)
    return sessionStorage.getItem(MOCK_LOGTO_STORAGE_KEY) || fallback
  } catch {
    return fallback
  }
}

/** 沒有對應會員資料的 SSO 帳號（第一次登入填寫會員資料，#48） */
const NEW_SSO_ACCOUNTS: Record<string, SsoAccount> = {
  // SSO 用手機註冊：只有手機，可補填 email
  'phoneonly@test.com': { name: '陳小安', email: null, phone: '0911000111' },
  // 用 Line、Google 註冊：email、手機都沒有，至少要補一個
  'nocontact@test.com': { name: 'Line 使用者', email: null, phone: null },
}

function createMockSsoAccount(email: string): SsoAccount {
  const preset = NEW_SSO_ACCOUNTS[normalizeEmail(email)]
  if (preset) return { ...preset }
  const user = findUserByEmail(email)
  if (user) return { name: user.name, email: user.email, phone: user.phone }
  // 其他未註冊信箱（例如 notfound@test.com）：SSO 用 email 註冊，可補填手機
  return { name: '新朋友', email: email.trim(), phone: null }
}

/** 目前登入的 SSO 帳號；補填聯絡方式、送出會員資料（姓名寫回 SSO）時會更新，重新整理即還原 */
export const mockSsoAccount: SsoAccount = createMockSsoAccount(readMockLogtoEmail())

// 找到（或新建）的會員資料記住 id，之後在個人資訊頁改了 email、手機也還對得到（真實後端用 SSO 使用者 ID 對應）
let ssoMemberId: string | undefined

/** 目前 SSO 帳號的會員資料：第一次用 email／手機對應；沒有回 undefined（尚未填會員資料） */
export function findSsoMember(): MockUser | undefined {
  if (ssoMemberId) return db.users.find((u) => u.id === ssoMemberId)
  const { email, phone } = mockSsoAccount
  const user = db.users.find(
    (u) => (!!email && u.email.toLowerCase() === normalizeEmail(email)) || (!!phone && u.phone === phone),
  )
  ssoMemberId = user?.id
  return user
}

/** 會員資料申請送出後，把新建的會員資料連到目前的 SSO 帳號 */
export function linkSsoMember(user: MockUser) {
  ssoMemberId = user.id
}

export const readBearer = (request: Request) => {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
}

/** 是否為 Logto 發的 JWT（header.payload.signature） */
export const isLogtoToken = (token: string) => token.split('.').length === 3

/** 依 token 找測試帳號（不看帳號狀態）；找不到回 undefined */
export function findUserByToken(token: string): MockUser | undefined {
  if (token.startsWith(TOKEN_PREFIX)) return db.users.find((u) => u.id === token.slice(TOKEN_PREFIX.length))
  if (isLogtoToken(token)) return findSsoMember()
  return undefined
}

/** Logto 模式：取出目前登入的 SSO 帳號（不需要有會員資料）；不是 Logto 的 token 回 401 */
export function requireSsoAccount(request: Request): SsoAccount {
  if (!isLogtoToken(readBearer(request))) throw errorResponse('UNAUTHORIZED')
  return mockSsoAccount
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

/* ---------- 會員資料（註冊、會員資料申請共用） ---------- */

function isMinor(birthDate: string) {
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return false
  const adultOn = new Date(birth)
  adultOn.setFullYear(adultOn.getFullYear() + 18)
  return adultOn.getTime() > Date.now()
}

/** 未滿 18 歲要填監護人 */
export function assertGuardian(birthDate: string, guardianName?: string) {
  if (isMinor(birthDate) && !guardianName?.trim()) {
    throw errorResponse('VALIDATION_ERROR', '未滿 18 歲需填寫監護人名稱', { guardianName: '必填' })
  }
}

/** 教會／牧區／小組／EKK 要在同一條線上，靈程要是有效選項 */
export function assertOrgAndJourney(body: { churchId: string; districtId: string; groupId: string; ekkId: string; journey: string }) {
  const ekk = ekks.find((e) => e.id === body.ekkId)
  const group = groups.find((g) => g.id === body.groupId)
  const district = districts.find((d) => d.id === body.districtId)
  const church = churches.find((c) => c.id === body.churchId)
  const orgOk = ekk?.groupId === group?.id && group?.districtId === district?.id && district?.churchId === church?.id
  if (!church || !district || !group || !ekk || !orgOk) {
    throw errorResponse('VALIDATION_ERROR', '教會／牧區／小組／EKK 不相符', { ekkId: '選項不相符' })
  }
  if (!journeys.some((j) => j.id === body.journey)) {
    throw errorResponse('VALIDATION_ERROR', undefined, { journey: '無此靈程' })
  }
}
