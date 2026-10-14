// 註冊流程：OTP → 個資聲明 → 送出；以及審核進度查詢
import { http, HttpResponse } from 'msw'
import type {
  ProgressOtpRequest,
  ProgressQueryRequest,
  ProgressQueryResponse,
  ProgressStatus,
  RegisterOtpRequest,
  RegisterOtpVerifyRequest,
  RegisterRequest,
} from '../../api/types'
import { db, findUserByEmail, newUserId, normalizeEmail } from '../db'
import type { MockUser } from '../db'
import {
  api,
  assertEmailPhone,
  assertGuardian,
  assertNotRateLimited,
  assertOrgAndJourney,
  assertOtp,
  assertPassword,
  type Contact,
  errorResponse,
  mockDelay,
  otpResponse,
  randomToken,
  readBody,
  readContact,
} from '../utils'

const PRIVACY_PARAGRAPH =
  '本會為執行會員管理、活動聯繫及奉獻收據開立等業務，需蒐集、處理及利用您的個人資料。您的個人資料僅在上述目的範圍內使用，並依個人資料保護法妥善保管，未經您同意不會提供予第三人。您可隨時向本會請求查詢、閱覽、補充、更正、停止蒐集處理利用或刪除您的個人資料。'

/** 進度查詢：已發送驗證碼的對象 */
let progressOtpContact: Contact | null = null

/** 用申請時的 email 或手機找會員資料 */
const findApplicant = (contact: Contact): MockUser | undefined =>
  db.users.find((u) =>
    contact.type === 'email' ? u.email.toLowerCase() === normalizeEmail(contact.value) : u.phone === contact.value,
  )

export const registerHandlers = [
  http.post(api('/register/otp'), async ({ request }) => {
    await mockDelay()
    const body = await readBody<RegisterOtpRequest>(request, ['birthDate', 'email', 'phone'])
    assertNotRateLimited(body.email)
    assertEmailPhone(body.email, body.phone)
    assertGuardian(body.birthDate, body.guardianName)
    // 已有帳號（含已鎖定／待審核）的信箱或手機不可再註冊
    if (db.users.some((u) => u.email.toLowerCase() === normalizeEmail(body.email) || u.phone === body.phone)) {
      return errorResponse('ALREADY_REGISTERED')
    }
    return otpResponse()
  }),

  http.post(api('/register/otp/verify'), async ({ request }) => {
    await mockDelay()
    const body = await readBody<RegisterOtpVerifyRequest>(request, ['email', 'phone', 'otp'])
    assertOtp(body.otp)
    const registerToken = randomToken('mock-register-')
    db.registerTokens.set(registerToken, normalizeEmail(body.email))
    return HttpResponse.json({ registerToken })
  }),

  http.get(api('/register/privacy-statement'), async () => {
    await mockDelay()
    // 內容夠長才能測「捲到底才可勾選同意」
    const content = Array.from({ length: 12 }, (_, i) => `${i + 1}. ${PRIVACY_PARAGRAPH}`).join('\n\n')
    return HttpResponse.json({ title: '個資保護聲明', content, version: '2026-01' })
  }),

  http.post(api('/register'), async ({ request }) => {
    await mockDelay()
    const body = await readBody<RegisterRequest>(request, [
      'registerToken',
      'birthDate',
      'email',
      'phone',
      'name',
      'gender',
      'idNumber',
      'password',
      'churchId',
      'districtId',
      'groupId',
      'ekkId',
      'journey',
    ])

    if (db.registerTokens.get(body.registerToken) !== normalizeEmail(body.email)) return errorResponse('TOKEN_INVALID')
    if (body.agreedToPrivacy !== true) {
      return errorResponse('VALIDATION_ERROR', '需同意個資保護聲明', { agreedToPrivacy: '必須同意' })
    }
    assertEmailPhone(body.email, body.phone)
    assertPassword(body.password)

    assertOrgAndJourney(body)

    if (
      findUserByEmail(body.email) ||
      db.users.some((u) => u.phone === body.phone || u.idNumber.toUpperCase() === body.idNumber.toUpperCase())
    ) {
      return errorResponse('ALREADY_REGISTERED')
    }

    const user: MockUser = {
      id: newUserId(),
      email: body.email.trim(),
      password: body.password,
      phone: body.phone,
      name: body.name,
      nickname: body.nickname ?? '',
      gender: body.gender,
      idNumber: body.idNumber.toUpperCase(),
      churchId: body.churchId,
      districtId: body.districtId,
      groupId: body.groupId,
      ekkId: body.ekkId,
      journey: body.journey,
      role: 'member',
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      birthDate: body.birthDate,
      guardianName: body.guardianName,
    }
    db.users.push(user)
    db.registerTokens.delete(body.registerToken)
    return HttpResponse.json({ id: user.id, status: 'PENDING' as const }, { status: 201 })
  }),

  // 進度查詢（#52）：email 或手機擇一 → 驗證碼 → 進度。不透露帳號是否存在：
  // 查無申請紀錄時發送照樣回成功（真實後端不會寄出），驗證時一律回驗證碼錯誤
  http.post(api('/register/progress/otp'), async ({ request }) => {
    await mockDelay()
    const contact = readContact(await readBody<ProgressOtpRequest>(request))
    if (contact.type === 'email') assertNotRateLimited(contact.value)
    progressOtpContact = contact
    return otpResponse()
  }),

  http.post(api('/register/progress'), async ({ request }) => {
    await mockDelay()
    const body = await readBody<ProgressQueryRequest>(request, ['otp'])
    const contact = readContact(body)
    assertOtp(body.otp)
    if (progressOtpContact?.type !== contact.type || progressOtpContact.value !== contact.value) {
      return errorResponse('OTP_EXPIRED', '請重新發送驗證碼')
    }
    const user = findApplicant(contact)
    if (!user) return errorResponse('OTP_INVALID')
    progressOtpContact = null

    const status: ProgressStatus =
      user.status === 'PENDING' ? 'PENDING' : user.status === 'REJECTED' ? 'REJECTED' : 'APPROVED'
    const res: ProgressQueryResponse = {
      status,
      submittedAt: user.submittedAt,
      ...(user.reviewedAt ? { reviewedAt: user.reviewedAt } : {}),
      ...(status === 'REJECTED' && user.rejectReason ? { rejectReason: user.rejectReason } : {}),
    }
    return HttpResponse.json(res)
  }),
]
