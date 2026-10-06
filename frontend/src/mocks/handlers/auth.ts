// 登入、登出、Line OAuth（stub）
import { http, HttpResponse } from 'msw'
import type { LineAuthPurpose, LineCallbackRequest, LoginRequest } from '../../api/types'
import { db, findUserByEmail } from '../db'
import {
  api,
  assertNotRateLimited,
  errorResponse,
  makeToken,
  mockDelay,
  noContent,
  randomToken,
  readBody,
} from '../utils'

export const authHandlers = [
  http.post(api('/auth/login'), async ({ request }) => {
    await mockDelay()
    const { email, password } = await readBody<LoginRequest>(request, ['email', 'password'])

    assertNotRateLimited(email)
    const user = findUserByEmail(email)
    if (!user) return errorResponse('ACCOUNT_NOT_FOUND')

    // 鎖定／待審核／被退回的帳號不看密碼，方便直接測試對應畫面
    if (user.status === 'LOCKED') return errorResponse('ACCOUNT_LOCKED')
    if (user.status === 'PENDING') return errorResponse('ACCOUNT_PENDING')
    if (user.status === 'REJECTED') return errorResponse('ACCOUNT_REJECTED')
    if (user.password !== password) return errorResponse('WRONG_PASSWORD')

    return HttpResponse.json({ token: makeToken(user), role: user.role })
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
    return HttpResponse.json({ status: 'LOGGED_IN', token: makeToken(user), role: user.role })
  }),
]
