// 目前登入會員：/me 與個人資訊修改（需 OTP）
// #49：email、手機、密碼以 SSO 為準。驗證通過後寫回 SSO（Logto 模式寫回 utils.ts 的 mockSsoAccount）。
import { http, HttpResponse } from 'msw'
import type { Me, OtpSentTo, ProfileChangeOtpResponse, ProfileChangeRequest, ProfileChangeVerifyRequest } from '../../api/types'
import { PHONE_PATTERN } from '../../constants/validation'
import { db, maskIdNumber, normalizeEmail, orgNames, SSO_TAKEN_CONTACTS } from '../db'
import type { MockUser } from '../db'
import {
  api,
  assertNotRateLimited,
  assertOtp,
  EMAIL_PATTERN,
  errorResponse,
  isLogtoToken,
  mockDelay,
  mockSsoAccount,
  OTP_EXPIRES_IN,
  OTP_LENGTH,
  readBearer,
  readBody,
  requireUser,
} from '../utils'

/** 把 db 的使用者轉成 /me 的回應格式（身分證字號遮罩；沒有的 email／手機為 null） */
function toMe(user: MockUser): Me {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    gender: user.gender,
    idNumber: maskIdNumber(user.idNumber),
    email: user.email || null,
    phone: user.phone || null,
    ...orgNames(user),
    journey: user.journey,
    role: user.role,
    hasPassword: user.password !== '',
  }
}

/** 新的 email／手機是否已被其他 SSO 帳號使用（真實後端要查 SSO 的所有使用者，不只會員中心的會員） */
function isEmailTaken(email: string, self: MockUser) {
  const value = normalizeEmail(email)
  return value === SSO_TAKEN_CONTACTS.email || db.users.some((u) => u !== self && u.email.toLowerCase() === value)
}

function isPhoneTaken(phone: string, self: MockUser) {
  return phone === SSO_TAKEN_CONTACTS.phone || db.users.some((u) => u !== self && u.phone === phone)
}

/** a.b@gmail.com → a***@gmail.com；0912345678 → 0912***678（真實後端遮罩規則可自訂） */
function maskContact(channel: OtpSentTo['channel'], value: string) {
  if (channel === 'phone') return `${value.slice(0, 4)}***${value.slice(-3)}`
  const [local, domain] = value.split('@')
  return `${local.slice(0, 1)}***@${domain}`
}

/**
 * 驗證碼寄送對象（#49，2026-10-15 決定）：新增／更換 → 新的；移除 → 留下的那個（重新驗證身分）；
 * 都沒改 → 現有的（email 優先）。呼叫前已確認 email、手機最多只改一個
 */
function otpTarget(user: MockUser, body: ProfileChangeRequest): OtpSentTo {
  const pick = (channel: OtpSentTo['channel'], value: string): OtpSentTo => ({
    channel,
    destination: maskContact(channel, value),
  })
  if (body.email !== user.email) return body.email ? pick('email', body.email) : pick('phone', body.phone)
  if (body.phone !== user.phone) return body.phone ? pick('phone', body.phone) : pick('email', body.email)
  return body.email ? pick('email', body.email) : pick('phone', body.phone)
}

export const memberHandlers = [
  http.get(api('/me'), async ({ request }) => {
    await mockDelay()
    return HttpResponse.json(toMe(requireUser(request)))
  }),

  // 送出修改內容並發送 OTP；內容先暫存，OTP 驗證通過才正式寫入（並寫回 SSO）
  http.post(api('/me/profile-change/otp'), async ({ request }) => {
    await mockDelay()
    const user = requireUser(request)
    const raw = await readBody<ProfileChangeRequest>(request, ['name'])
    const body: ProfileChangeRequest = {
      name: raw.name.trim(),
      nickname: raw.nickname?.trim() ?? '',
      email: raw.email?.trim() ?? '',
      phone: raw.phone?.trim() ?? '',
    }

    // email、手機至少留一個（D5）
    if (!body.email && !body.phone) {
      const message = '信箱和手機至少要留一個'
      return errorResponse('VALIDATION_ERROR', message, { email: message, phone: message })
    }
    const fields: Record<string, string> = {}
    if (body.email && !EMAIL_PATTERN.test(body.email)) fields.email = '信箱格式錯誤'
    if (body.phone && !PHONE_PATTERN.test(body.phone)) fields.phone = '手機格式錯誤'
    if (Object.keys(fields).length > 0) return errorResponse('VALIDATION_ERROR', undefined, fields)
    if (body.email) assertNotRateLimited(body.email)

    // email、手機一次只能改一個（新增、更換或移除），驗證碼才有明確的寄送對象
    const emailChanged = normalizeEmail(body.email) !== user.email.toLowerCase()
    if (emailChanged && body.phone !== user.phone) {
      const message = '信箱和手機一次只能修改一個'
      return errorResponse('VALIDATION_ERROR', message, { email: message, phone: message })
    }

    // 已被其他 SSO 帳號使用：發驗證碼前就擋下（#49），fields 指出是哪一欄
    const taken: Record<string, string> = {}
    if (body.email && normalizeEmail(body.email) !== user.email.toLowerCase() && isEmailTaken(body.email, user)) {
      taken.email = '此信箱已被其他帳號使用'
    }
    if (body.phone && body.phone !== user.phone && isPhoneTaken(body.phone, user)) {
      taken.phone = '此手機已被其他帳號使用'
    }
    if (Object.keys(taken).length > 0) return errorResponse('CONTACT_IN_USE', undefined, taken)

    db.profileChanges.set(user.id, body)
    const res: ProfileChangeOtpResponse = {
      expiresIn: OTP_EXPIRES_IN,
      length: OTP_LENGTH,
      sentTo: otpTarget(user, { ...body, email: emailChanged ? body.email : user.email }),
    }
    return HttpResponse.json(res)
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
    // 真實後端：更換／移除 email 或手機後，寄安全通知到原本的那個（mock 不寄）
    // Logto 模式：姓名、email、手機寫回 SSO 帳號（真實後端用 Logto Management API）
    if (isLogtoToken(readBearer(request))) {
      Object.assign(mockSsoAccount, { name: change.name, email: change.email || null, phone: change.phone || null })
    }
    return HttpResponse.json(toMe(user))
  }),
]
