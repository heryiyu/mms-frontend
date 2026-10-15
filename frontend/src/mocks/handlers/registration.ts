// Logto 模式：第一次登入填寫會員資料（#48）。帳號、密碼在 SSO，這裡只收會員資料；
// 登入者一律是 utils.ts 的 mockSsoAccount（網址 ?mockLogto=<信箱> 切換，見 mocks/README.md）。
import { http, HttpResponse } from 'msw'
import type {
  ContactOtpRequest,
  ContactVerifyRequest,
  RegistrationDraft,
  RegistrationInfo,
  RegistrationRequest,
  SsoAccount,
} from '../../api/types'
import { db, newUserId, normalizeEmail, type MockUser } from '../db'
import {
  api,
  assertGuardian,
  assertNotRateLimited,
  assertOrgAndJourney,
  assertOtp,
  type Contact,
  errorResponse,
  findSsoMember,
  linkSsoMember,
  MOCK_SSO_PASSWORD,
  mockDelay,
  mockSsoHasPassword,
  otpResponse,
  readBody,
  readContact,
  requireSsoAccount,
} from '../utils'

/** 已被其他帳號使用（真實後端要查 SSO 的所有使用者） */
function isContactUsed(contact: Contact, self: MockUser | undefined) {
  return db.users.some(
    (u) =>
      u !== self &&
      (contact.type === 'email' ? u.email.toLowerCase() === normalizeEmail(contact.value) : u.phone === contact.value),
  )
}

function assertContactAvailable(account: SsoAccount, contact: Contact) {
  if (account[contact.type]) {
    throw errorResponse('VALIDATION_ERROR', '此帳號已有這個聯絡方式', { [contact.type]: '已有' })
  }
  if (isContactUsed(contact, findSsoMember())) throw errorResponse('ALREADY_REGISTERED')
}

/** 已發送驗證碼、等待驗證的聯絡方式 */
let pendingContact: Contact | null = null

function toDraft(user: MockUser): Partial<RegistrationDraft> {
  return {
    ...(user.birthDate ? { birthDate: user.birthDate } : {}),
    ...(user.guardianName ? { guardianName: user.guardianName } : {}),
    name: user.name,
    nickname: user.nickname,
    gender: user.gender,
    churchId: user.churchId,
    districtId: user.districtId,
    groupId: user.groupId,
    ekkId: user.ekkId,
    journey: user.journey,
  }
}

export const registrationHandlers = [
  http.get(api('/me/registration'), async ({ request }) => {
    await mockDelay()
    const account = requireSsoAccount(request)
    const user = findSsoMember()
    if (user?.status === 'LOCKED') return errorResponse('ACCOUNT_LOCKED')
    const res: RegistrationInfo = { status: user ? user.status : 'UNREGISTERED', account: { ...account } }
    if (user?.status === 'REJECTED') {
      res.rejectReason = user.rejectReason
      res.previous = toDraft(user)
    }
    return HttpResponse.json(res)
  }),

  http.post(api('/me/registration/contact/otp'), async ({ request }) => {
    await mockDelay()
    const account = requireSsoAccount(request)
    const contact = readContact(await readBody<ContactOtpRequest>(request))
    if (contact.type === 'email') assertNotRateLimited(contact.value)
    assertContactAvailable(account, contact)
    pendingContact = contact
    return otpResponse()
  }),

  // 驗證通過即寫回 SSO 帳號（mockSsoAccount），之後也能用它登入
  http.post(api('/me/registration/contact/verify'), async ({ request }) => {
    await mockDelay()
    const account = requireSsoAccount(request)
    const body = await readBody<ContactVerifyRequest>(request, ['otp'])
    const contact = readContact(body)
    assertOtp(body.otp)
    if (pendingContact?.type !== contact.type || pendingContact.value !== contact.value) {
      return errorResponse('OTP_EXPIRED', '請重新發送驗證碼')
    }
    assertContactAvailable(account, contact)
    pendingContact = null
    account[contact.type] = contact.value
    // 被退回後補填的人已有會員資料，一併更新
    const user = findSsoMember()
    if (user) user[contact.type] = contact.value
    return HttpResponse.json({ ...account })
  }),

  http.post(api('/me/registration'), async ({ request }) => {
    await mockDelay()
    const account = requireSsoAccount(request)
    const body = await readBody<RegistrationRequest>(request, [
      'birthDate',
      'name',
      'gender',
      'idNumber',
      'churchId',
      'districtId',
      'groupId',
      'ekkId',
      'journey',
    ])
    if (!account.email && !account.phone) {
      return errorResponse('VALIDATION_ERROR', '請至少填寫電子信箱或手機', { contact: '必填' })
    }
    if (body.agreedToPrivacy !== true) {
      return errorResponse('VALIDATION_ERROR', '需同意個資保護聲明', { agreedToPrivacy: '必須同意' })
    }
    assertGuardian(body.birthDate, body.guardianName)
    assertOrgAndJourney(body)

    const existing = findSsoMember()
    if (existing?.status === 'LOCKED') return errorResponse('ACCOUNT_LOCKED')
    if (existing && existing.status !== 'REJECTED') return errorResponse('ALREADY_PROCESSED', '會員資料已送出')
    const idNumber = body.idNumber.trim().toUpperCase()
    if (db.users.some((u) => u !== existing && u.idNumber.toUpperCase() === idNumber)) {
      return errorResponse('ALREADY_REGISTERED', '此身分證字號已被使用')
    }

    const fields = {
      email: account.email ?? '',
      phone: account.phone ?? '',
      name: body.name.trim(),
      nickname: body.nickname?.trim() ?? '',
      gender: body.gender,
      idNumber,
      churchId: body.churchId,
      districtId: body.districtId,
      groupId: body.groupId,
      ekkId: body.ekkId,
      journey: body.journey,
      birthDate: body.birthDate,
      guardianName: body.guardianName,
      status: 'PENDING' as const,
      submittedAt: new Date().toISOString(),
      reviewedAt: undefined,
      rejectReason: undefined,
    }
    if (existing) {
      // 被退回後重新送出：同一筆資料改回待審核
      Object.assign(existing, fields)
    } else {
      // 密碼在 SSO；mock 只用它表示有沒有密碼（Line、Google 註冊的沒有，#49）
      const password = mockSsoHasPassword ? MOCK_SSO_PASSWORD : ''
      const user: MockUser = { id: newUserId(), password, role: 'member', ...fields }
      db.users.push(user)
      linkSsoMember(user)
    }
    // 姓名以會員中心為準，同步寫回 SSO（架構整理 D2）
    account.name = fields.name
    return HttpResponse.json({ status: 'PENDING' as const }, { status: 201 })
  }),
]
