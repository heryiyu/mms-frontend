// 目前登入會員：/me 與個人資訊修改（需 OTP）
import { http, HttpResponse } from 'msw'
import type { Me, ProfileChangeRequest, ProfileChangeVerifyRequest } from '../../api/types'
import { db, findUserByEmail, maskIdNumber, orgNames } from '../db'
import type { MockUser } from '../db'
import {
  api,
  assertEmailPhone,
  assertNotRateLimited,
  assertOtp,
  errorResponse,
  mockDelay,
  otpResponse,
  readBody,
  requireUser,
} from '../utils'

/** 把 db 的使用者轉成 /me 的回應格式（身分證字號遮罩） */
function toMe(user: MockUser): Me {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    gender: user.gender,
    idNumber: maskIdNumber(user.idNumber),
    email: user.email,
    phone: user.phone,
    ...orgNames(user),
    journey: user.journey,
    role: user.role,
  }
}

export const memberHandlers = [
  http.get(api('/me'), async ({ request }) => {
    await mockDelay()
    return HttpResponse.json(toMe(requireUser(request)))
  }),

  // 送出修改內容並發送 OTP；內容先暫存，OTP 驗證通過才正式寫入
  http.post(api('/me/profile-change/otp'), async ({ request }) => {
    await mockDelay()
    const user = requireUser(request)
    const body = await readBody<ProfileChangeRequest>(request, ['name', 'email', 'phone'])
    assertNotRateLimited(body.email)
    assertEmailPhone(body.email, body.phone)

    const emailOwner = findUserByEmail(body.email)
    const phoneOwner = db.users.find((u) => u.phone === body.phone)
    if ((emailOwner && emailOwner.id !== user.id) || (phoneOwner && phoneOwner.id !== user.id)) {
      return errorResponse('ALREADY_REGISTERED')
    }

    db.profileChanges.set(user.id, { ...body, nickname: body.nickname ?? '' })
    return otpResponse()
  }),

  http.post(api('/me/profile-change/verify'), async ({ request }) => {
    await mockDelay()
    const user = requireUser(request)
    const { otp } = await readBody<ProfileChangeVerifyRequest>(request, ['otp'])
    assertOtp(otp)

    const change = db.profileChanges.get(user.id)
    if (!change) return errorResponse('OTP_EXPIRED') // 沒有待驗證的修改，視同 OTP 已失效
    Object.assign(user, { name: change.name, nickname: change.nickname, email: change.email, phone: change.phone })
    db.profileChanges.delete(user.id)
    return HttpResponse.json(toMe(user))
  }),
]
