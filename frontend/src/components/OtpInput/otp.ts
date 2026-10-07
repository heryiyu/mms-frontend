// OTP 共用的純函式：輸入整理、Form 驗證規則、API 錯誤 → 提示文案
import type { Rule } from 'antd/es/form'
import { isApiError } from '../../api/client'
import { OTP_DEFAULT_LENGTH } from '../../constants/otp'

/**
 * OTP 相關提示文案。
 * TODO(#12)：驗證碼錯誤／逾時的提示樣式與文案設計未畫（docs/design/questions.md「OTP 驗證」）；
 * 註冊稿註記「輸入錯誤需跳pop提醒」，推測用 NoticeModal（通知彈窗），各流程可改用 inline 錯誤。
 */
export const OTP_MESSAGES = {
  required: '請輸入驗證碼',
  incomplete: (length: number) => `請輸入 ${length} 碼驗證碼`,
  invalid: '驗證碼錯誤，請重新輸入',
  expired: '驗證碼已逾時，請重新發送',
  tooManyAttempts: '發送過於頻繁，請稍後再試',
  /** 倒數框文字：有效時間4：50 */
  timer: (countdown: string) => `有效時間${countdown}`,
  /** 尚未發送（沒有 expiresAt）時倒數框的文字 */
  timerIdle: '有效時間-：--',
  /** 倒數結束、沒有提供 onResend 時倒數框的文字 */
  timerExpired: '驗證碼已逾時',
  resend: '重新發送',
} as const

/** 全形數字轉半形、去掉非數字、截到 length 位 */
export function sanitizeOtp(raw: string, length = OTP_DEFAULT_LENGTH): string {
  return raw
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, '')
    .slice(0, length)
}

/** Form.Item 用的驗證規則：必填＋位數。例：<Form.Item name="otp" rules={otpRules(length)}> */
export function otpRules(length = OTP_DEFAULT_LENGTH): Rule[] {
  return [
    { required: true, message: OTP_MESSAGES.required },
    {
      validator: (_, value?: string) =>
        !value || value.length === length ? Promise.resolve() : Promise.reject(new Error(OTP_MESSAGES.incomplete(length))),
    },
  ]
}

/**
 * 把「發送／驗證 OTP」API 的錯誤轉成提示文案；不是 OTP 相關錯誤時回 null，由各流程自行處理
 * （例如 EMAIL_PHONE_MISMATCH、ALREADY_REGISTERED）。
 */
export function getOtpErrorMessage(error: unknown): string | null {
  if (isApiError(error, 'OTP_INVALID')) return OTP_MESSAGES.invalid
  if (isApiError(error, 'OTP_EXPIRED')) return OTP_MESSAGES.expired
  if (isApiError(error, 'TOO_MANY_ATTEMPTS')) return OTP_MESSAGES.tooManyAttempts
  return null
}
