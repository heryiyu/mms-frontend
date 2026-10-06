// 奉獻收據：OTP 驗證後寄到信箱
import { http } from 'msw'
import type { ReceiptOtpRequest, ReceiptSendRequest } from '../../api/types'
import type { MockUser } from '../db'
import {
  api,
  assertEmailPhone,
  assertNotRateLimited,
  assertOtp,
  errorResponse,
  mockDelay,
  noContent,
  otpResponse,
  readBody,
  requireUser,
} from '../utils'

/** 填的信箱、手機必須和登入會員的資料一致 */
function assertMatchesMember(user: MockUser, email: string, phone: string) {
  if (user.email.toLowerCase() !== email.trim().toLowerCase() || user.phone !== phone) {
    throw errorResponse('EMAIL_PHONE_MISMATCH')
  }
}

export const receiptHandlers = [
  http.post(api('/receipts/otp'), async ({ request }) => {
    await mockDelay()
    const user = requireUser(request)
    const body = await readBody<ReceiptOtpRequest>(request, ['email', 'phone'])
    assertNotRateLimited(body.email)
    assertEmailPhone(body.email, body.phone)
    assertMatchesMember(user, body.email, body.phone)
    return otpResponse()
  }),

  http.post(api('/receipts/send'), async ({ request }) => {
    await mockDelay()
    const user = requireUser(request)
    const body = await readBody<ReceiptSendRequest>(request, ['email', 'phone', 'otp'])
    assertOtp(body.otp)
    assertMatchesMember(user, body.email, body.phone)
    // 沒帶年度時預設去年；2020 年以前視為沒有奉獻紀錄
    const year = body.year ?? new Date().getFullYear() - 1
    if (year < 2020) return errorResponse('NO_RECORDS')
    return noContent()
  }),
]
