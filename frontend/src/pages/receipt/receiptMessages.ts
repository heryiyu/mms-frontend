// 奉獻收據頁與下載頁共用文案（#50）
// TODO(#12)：寄送方式、下載頁、密碼規則說明的文案設計稿沒有，先依現有畫面風格撰寫
// 「驗證碼已寄到…」與個人資訊修改共用 components/OtpInput 的 OTP_MESSAGES.sentTo
import type { ReceiptPasswordRule } from '../../api/types'

/** PDF 密碼規則說明（不顯示密碼本身）：身分證字號；沒有身分證字號改用出生年月日 8 碼 */
export function passwordHint(rule: ReceiptPasswordRule): string {
  return rule === 'BIRTH_DATE' ? '密碼為出生年月日 8 碼（例：1990 年 5 月 20 日為 19900520）' : '密碼為身分證字號'
}

/** 時間顯示為 HH:mm（24 小時制） */
export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}
