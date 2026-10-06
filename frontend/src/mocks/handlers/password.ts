// 忘記密碼（OTP → 重設）與已登入的修改密碼
import { http, HttpResponse } from 'msw'
import type {
  ChangePasswordRequest,
  ForgotPasswordOtpRequest,
  ForgotPasswordVerifyRequest,
  ResetPasswordRequest,
} from '../../api/types'
import { db, findUserByEmail } from '../db'
import {
  api,
  assertEmailPhone,
  assertNotRateLimited,
  assertOtp,
  assertPassword,
  errorResponse,
  mockDelay,
  noContent,
  otpResponse,
  randomToken,
  readBody,
  requireUser,
} from '../utils'

export const passwordHandlers = [
  http.post(api('/password/forgot/otp'), async ({ request }) => {
    await mockDelay()
    const body = await readBody<ForgotPasswordOtpRequest>(request, ['email', 'phone'])
    assertNotRateLimited(body.email)
    assertEmailPhone(body.email, body.phone)
    const user = findUserByEmail(body.email)
    if (!user) return errorResponse('ACCOUNT_NOT_FOUND')
    if (user.phone !== body.phone) return errorResponse('EMAIL_PHONE_MISMATCH')
    return otpResponse()
  }),

  http.post(api('/password/forgot/verify'), async ({ request }) => {
    await mockDelay()
    const body = await readBody<ForgotPasswordVerifyRequest>(request, ['email', 'phone', 'otp'])
    assertOtp(body.otp)
    const user = findUserByEmail(body.email)
    if (!user || user.phone !== body.phone) return errorResponse('EMAIL_PHONE_MISMATCH')
    const resetToken = randomToken('mock-reset-')
    db.resetTokens.set(resetToken, user.id)
    return HttpResponse.json({ resetToken })
  }),

  http.post(api('/password/forgot/reset'), async ({ request }) => {
    await mockDelay()
    const body = await readBody<ResetPasswordRequest>(request, ['resetToken', 'newPassword'])
    const userId = db.resetTokens.get(body.resetToken)
    const user = db.users.find((u) => u.id === userId)
    if (!user) return errorResponse('TOKEN_INVALID')
    assertPassword(body.newPassword, 'newPassword')
    user.password = body.newPassword
    db.resetTokens.delete(body.resetToken)
    return noContent()
  }),

  http.put(api('/me/password'), async ({ request }) => {
    await mockDelay()
    const user = requireUser(request)
    const body = await readBody<ChangePasswordRequest>(request, ['currentPassword', 'newPassword'])
    if (user.password !== body.currentPassword) return errorResponse('WRONG_CURRENT_PASSWORD')
    if (body.newPassword === body.currentPassword) return errorResponse('PASSWORD_SAME_AS_OLD')
    assertPassword(body.newPassword, 'newPassword')
    user.password = body.newPassword
    return noContent()
  }),
]
