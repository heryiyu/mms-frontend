// 奉獻收據（#50）：用會員已有的 email 或手機驗證後寄出
// - email → 加密 PDF 附件（mock 不寄信）
// - 手機 → 簡訊寄下載頁網址 /receipt/download/:id（mock 不發簡訊，建立一筆 1 小時內有效的下載連結）
//
// 下載頁的固定 id（直接開 /receipt/download/<id> 測各種狀態）：
// - demo-valid   有效（擁有者 = 目前登入的人，到期時間 = 頁面載入後 1 小時）
// - demo-expired 已過期 → 410 LINK_EXPIRED（擁有者 = 目前登入的人）
// - demo-other   不是本人 → 403 FORBIDDEN（擁有者是 locked@test.com）
// - 其他 id      → 404 RECEIPT_NOT_FOUND
// 收據頁選手機寄出後，簡訊裡的下載頁網址會印在 DevTools Console（「[MSW] 奉獻收據簡訊下載頁：…」），
// 連結存在 sessionStorage（nlc_mms_mock_receipt_links），同一個分頁重新整理、貼上網址都還有效，關閉分頁即清除。
import { http, HttpResponse } from 'msw'
import type {
  ReceiptChannel,
  ReceiptDownloadInfo,
  ReceiptFileResponse,
  ReceiptOtpRequest,
  ReceiptOtpResponse,
  ReceiptPasswordRule,
  ReceiptSendRequest,
  ReceiptSendResponse,
  ReceiptSentTo,
} from '../../api/types'
import { receiptDownloadPath } from '../../routes/paths'
import { maskContact } from '../../utils/maskContact'
import { db, type MockUser } from '../db'
import {
  api,
  assertNotRateLimited,
  assertOtp,
  errorResponse,
  mockDelay,
  OTP_EXPIRES_IN,
  OTP_LENGTH,
  randomToken,
  readBody,
  requireUser,
} from '../utils'

/** 簡訊下載頁網址有效時間（寄出後 1 小時，2026-10-15 決定） */
const LINK_TTL_MS = 60 * 60 * 1000
/** 檔案網址有效秒數（5 分鐘） */
const FILE_URL_EXPIRES_IN = 300

const DEMO_LOADED_AT = Date.now()
const DEMO_IDS = { valid: 'demo-valid', expired: 'demo-expired', other: 'demo-other' } as const

const CHANNELS: ReceiptChannel[] = ['email', 'phone']

interface DownloadLink {
  userId: string
  year: number
  /** epoch ms */
  expiresAt: number
}

/* 寄出時建立的下載連結存在 sessionStorage：簡訊連結通常是重新開頁進來的，記憶體裡的 db 會被清掉 */
const LINKS_STORAGE_KEY = 'nlc_mms_mock_receipt_links'

function readLinks(): Record<string, DownloadLink> {
  try {
    return JSON.parse(sessionStorage.getItem(LINKS_STORAGE_KEY) ?? '{}') as Record<string, DownloadLink>
  } catch {
    return {}
  }
}

function saveLink(id: string, link: DownloadLink) {
  try {
    sessionStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify({ ...readLinks(), [id]: link }))
  } catch {
    // 無法寫入（隱私模式等）就只能用固定 id 測
  }
}

const passwordRuleOf = (user: MockUser): ReceiptPasswordRule => (user.idNumber ? 'ID_NUMBER' : 'BIRTH_DATE')

const defaultYear = () => new Date().getFullYear() - 1

/** 選定的寄送方式：要是 email／phone，且會員有這個聯絡方式 */
function readChannel(user: MockUser, channel: unknown): ReceiptSentTo {
  if (!CHANNELS.includes(channel as ReceiptChannel)) {
    throw errorResponse('VALIDATION_ERROR', undefined, { channel: '請選擇寄送方式' })
  }
  const value = channel === 'email' ? user.email : user.phone
  if (!value) {
    const message = channel === 'email' ? '會員資料沒有電子信箱' : '會員資料沒有手機'
    throw errorResponse('VALIDATION_ERROR', message, { channel: message })
  }
  return { channel: channel as ReceiptChannel, destination: maskContact(channel as ReceiptChannel, value) }
}

/** 下載連結：固定 id 的情境或寄出時建立的連結；找不到 404、不是本人 403、過期 410 */
function findDownload(user: MockUser, id: string) {
  const demo: Record<string, DownloadLink> = {
    [DEMO_IDS.valid]: { userId: user.id, year: defaultYear(), expiresAt: DEMO_LOADED_AT + LINK_TTL_MS },
    [DEMO_IDS.expired]: { userId: user.id, year: defaultYear(), expiresAt: Date.now() - 60 * 1000 },
    [DEMO_IDS.other]: { userId: 'u3', year: defaultYear(), expiresAt: Date.now() + LINK_TTL_MS },
  }
  const link = demo[id] ?? readLinks()[id]
  if (!link) throw errorResponse('RECEIPT_NOT_FOUND')
  if (link.userId !== user.id) throw errorResponse('FORBIDDEN', '這份收據不屬於目前登入的帳號')
  if (link.expiresAt <= Date.now()) throw errorResponse('LINK_EXPIRED')
  return link
}

/** 假的 PDF（一頁空白）；真實後端回雲端儲存的簽章網址，這裡在瀏覽器產生 blob 網址，5 分鐘後失效 */
function createFakePdfUrl(): string {
  const pdf = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >> endobj',
    'trailer << /Root 1 0 R >>',
    '%%EOF',
  ].join('\n')
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
  setTimeout(() => URL.revokeObjectURL(url), FILE_URL_EXPIRES_IN * 1000)
  return url
}

export const receiptHandlers = [
  http.post(api('/receipts/otp'), async ({ request }) => {
    await mockDelay()
    const user = requireUser(request)
    const body = await readBody<ReceiptOtpRequest>(request, ['channel'])
    const sentTo = readChannel(user, body.channel)
    if (user.email) assertNotRateLimited(user.email)
    db.receiptOtps.set(user.id, sentTo.channel)
    const res: ReceiptOtpResponse = { expiresIn: OTP_EXPIRES_IN, length: OTP_LENGTH, sentTo }
    return HttpResponse.json(res)
  }),

  http.post(api('/receipts/send'), async ({ request }) => {
    await mockDelay()
    const user = requireUser(request)
    const body = await readBody<ReceiptSendRequest>(request, ['channel', 'otp'])
    const sentTo = readChannel(user, body.channel)
    assertOtp(body.otp)
    // 沒有對應的發送紀錄（或寄送方式和發送驗證碼時不同）視同驗證碼已失效
    if (db.receiptOtps.get(user.id) !== sentTo.channel) return errorResponse('OTP_EXPIRED')
    // 沒帶年度時預設去年；2020 年以前視為沒有奉獻紀錄
    const year = body.year ?? defaultYear()
    if (year < 2020) return errorResponse('NO_RECORDS')
    db.receiptOtps.delete(user.id)

    const res: ReceiptSendResponse = { sentTo, passwordRule: passwordRuleOf(user) }
    if (sentTo.channel === 'phone') {
      const id = randomToken('r-')
      const expiresAt = Date.now() + LINK_TTL_MS
      saveLink(id, { userId: user.id, year, expiresAt })
      res.linkExpiresAt = new Date(expiresAt).toISOString()
      // 真實後端：簡訊內容只有下載頁網址（例如 https://<會員中心>/receipt/download/<id>），不放檔案連結
      console.info(`[MSW] 奉獻收據簡訊下載頁：${receiptDownloadPath(id)}`)
    }
    return HttpResponse.json(res)
  }),

  http.get(api('/receipts/downloads/:id'), async ({ request, params }) => {
    await mockDelay()
    const user = requireUser(request)
    const link = findDownload(user, String(params.id))
    const res: ReceiptDownloadInfo = {
      year: link.year,
      expiresAt: new Date(link.expiresAt).toISOString(),
      passwordRule: passwordRuleOf(user),
    }
    return HttpResponse.json(res)
  }),

  http.post(api('/receipts/downloads/:id/file'), async ({ request, params }) => {
    await mockDelay()
    const user = requireUser(request)
    const link = findDownload(user, String(params.id))
    const res: ReceiptFileResponse = {
      url: createFakePdfUrl(),
      expiresIn: FILE_URL_EXPIRES_IN,
      fileName: `奉獻收據-${link.year}.pdf`,
    }
    return HttpResponse.json(res)
  }),
]
