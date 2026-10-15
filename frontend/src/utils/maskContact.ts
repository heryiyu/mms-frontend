// 聯絡方式遮罩（#49、#50 共用）：a.b@gmail.com → a***@gmail.com；0912345678 → 0912***678
// - 奉獻收據頁顯示會員已有的 email／手機（GET /me 回完整值，前端遮罩）
// - MSW 產生 sentTo（個人資訊修改、奉獻收據）
// 真實後端的 sentTo 由後端遮罩，格式請與這裡一致（backend/README「OTP 通用規則」）
import type { OtpSentTo } from '../api/types'

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@')
  return `${local.slice(0, 1)}***@${domain}`
}

export function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`
}

export function maskContact(channel: OtpSentTo['channel'], value: string): string {
  return channel === 'email' ? maskEmail(value) : maskPhone(value)
}
