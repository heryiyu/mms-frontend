// 登入、登出、Line OAuth（stub）
import { http, HttpResponse } from 'msw'
import type { LineAuthPurpose, LineCallbackRequest, LoginRequest } from '../../api/types'
import { db, findUserByEmail, normalizeEmail } from '../db'
import {
  api,
  assertNotRateLimited,
  errorResponse,
  findSsoMember,
  findUserByToken,
  isLogtoToken,
  makeToken,
  mockDelay,
  noContent,
  randomToken,
  readBearer,
  readBody,
} from '../utils'

/**
 * 登入錯誤情境的觸發信箱（密碼任意），對照表見 mocks/README.md「登入」：
 * - error@test.com：500 且沒有錯誤碼，測通用錯誤文案
 * 申請被退回用種子帳號 rejected@test.com（db.ts）。
 */
const LOGIN_TRIGGERS: Record<string, () => Response> = {
  'error@test.com': () => HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 }),
}

/** 已確認（#12 L2）：密碼錯 3 次暫停 5 分鐘，暫停累計 3 次鎖帳號 */
const MAX_WRONG_PASSWORD = 3
const PAUSE_MS = 5 * 60_000
const MAX_PAUSES = 3

/** 各使用者的密碼錯誤計數（使用者 id → 狀態），存記憶體，重新整理頁面即重置 */
const loginAttempts = new Map<string, { wrong: number; pauses: number; pausedUntil: number }>()

export const authHandlers = [
  http.post(api('/auth/login'), async ({ request }) => {
    await mockDelay()
    const { email, password } = await readBody<LoginRequest>(request, ['email', 'password'])

    assertNotRateLimited(email)
    // 登入頁錯誤情境專用信箱（不在 db 內，避免影響審核清單）
    const loginTrigger = LOGIN_TRIGGERS[normalizeEmail(email)]
    if (loginTrigger) return loginTrigger()
    const user = findUserByEmail(email)
    if (!user) return errorResponse('ACCOUNT_NOT_FOUND')

    // 鎖定／待審核／被退回的帳號不看密碼，方便直接測試對應畫面
    if (user.status === 'LOCKED') return errorResponse('ACCOUNT_LOCKED')
    if (user.status === 'PENDING') return errorResponse('ACCOUNT_PENDING')
    if (user.status === 'REJECTED') return errorResponse('ACCOUNT_REJECTED')

    const attempt = loginAttempts.get(user.id) ?? { wrong: 0, pauses: 0, pausedUntil: 0 }
    loginAttempts.set(user.id, attempt)
    if (Date.now() < attempt.pausedUntil) return errorResponse('TOO_MANY_ATTEMPTS')
    if (user.password !== password) {
      attempt.wrong += 1
      if (attempt.wrong < MAX_WRONG_PASSWORD) return errorResponse('WRONG_PASSWORD')
      attempt.wrong = 0
      attempt.pauses += 1
      if (attempt.pauses >= MAX_PAUSES) {
        user.status = 'LOCKED'
        return errorResponse('ACCOUNT_LOCKED')
      }
      attempt.pausedUntil = Date.now() + PAUSE_MS
      return errorResponse('TOO_MANY_ATTEMPTS')
    }
    loginAttempts.delete(user.id)

    return HttpResponse.json({ token: makeToken(user), role: user.role, status: 'ACTIVE' })
  }),

  // Logto 模式（#44）：以 Logto access token 取得角色與帳號狀態；JWT 對應的 SSO 帳號見 utils.ts 的 mockSsoAccount。
  // 已通過 SSO 驗證一律 200（#48）：沒有會員資料 → UNREGISTERED；待審核、被退回照實回；只有鎖定回錯誤
  http.get(api('/auth/session'), async ({ request }) => {
    await mockDelay()
    const token = readBearer(request)
    const user = isLogtoToken(token) ? findSsoMember() : findUserByToken(token)
    if (!user) {
      return isLogtoToken(token)
        ? HttpResponse.json({ role: 'member', status: 'UNREGISTERED' })
        : errorResponse('UNAUTHORIZED')
    }
    if (user.status === 'LOCKED') return errorResponse('ACCOUNT_LOCKED')
    return HttpResponse.json({ role: user.role, status: user.status })
  }),

  // 登出：token 已失效也回 204，前端一律清掉本機 token
  http.post(api('/auth/logout'), async () => {
    await mockDelay()
    return noContent()
  }),

  // Line OAuth stub：授權網址直接指回本站的 /auth/line/callback，不會真的離開網站
  http.get(api('/auth/line/url'), async ({ request }) => {
    await mockDelay()
    const purpose = (new URL(request.url).searchParams.get('purpose') ?? 'login') as LineAuthPurpose
    const url = new URL('/auth/line/callback', request.url)
    url.searchParams.set('code', purpose === 'register' ? 'mock-line-new' : 'mock-line-code')
    url.searchParams.set('state', 'mock-state')
    return HttpResponse.json({ url: url.toString() })
  }),

  // code：mock-line-code → 登入一般會員；mock-line-new → 尚未綁定（接註冊流程）；mock-line-pending → 待審核
  http.post(api('/auth/line/callback'), async ({ request }) => {
    await mockDelay()
    const { code } = await readBody<LineCallbackRequest>(request, ['code', 'state'])

    if (code === 'mock-line-new') {
      return HttpResponse.json({ status: 'REGISTER_REQUIRED', lineToken: randomToken('mock-line-') })
    }
    if (code === 'mock-line-pending') return errorResponse('ACCOUNT_PENDING')
    if (code !== 'mock-line-code') return errorResponse('TOKEN_INVALID')

    const user = db.users.find((u) => u.id === 'u1')!
    return HttpResponse.json({ status: 'LOGGED_IN', token: makeToken(user), role: user.role, accountStatus: 'ACTIVE' })
  }),
]
