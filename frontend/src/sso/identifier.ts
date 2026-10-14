// 「電子信箱或手機」帳號欄位 → Experience API 的 identifier（登入、註冊、忘記密碼共用）。
import type { Rule } from 'antd/es/form'
import { PHONE_PATTERN } from '../constants/validation'
import type { Identifier } from './api/experience'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 台灣國碼。Logto 存的手機是「國碼＋去掉開頭 0」的純數字，例如 0912345678 → 886912345678 */
const TW_COUNTRY_CODE = '886'

export const IDENTIFIER_MESSAGES = {
  required: '請輸入電子信箱或手機號碼',
  format: '請輸入正確的電子信箱或手機號碼',
} as const

/** 畫面輸入的手機（0912345678）→ Logto 格式（886912345678） */
export const toLogtoPhone = (phone: string) => TW_COUNTRY_CODE + phone.slice(1)

/** Logto 格式的手機 → 畫面顯示（0912345678）；不是台灣號碼就原樣回傳 */
export const fromLogtoPhone = (phone: string) => (phone.startsWith(TW_COUNTRY_CODE) ? `0${phone.slice(TW_COUNTRY_CODE.length)}` : phone)

/** 單一帳號欄位：有 @ 當信箱，否則當手機；格式不符回 null */
export function parseIdentifier(value: string | undefined): Identifier | null {
  const trimmed = value?.trim() ?? ''
  if (trimmed.includes('@')) return EMAIL_PATTERN.test(trimmed) ? { type: 'email', value: trimmed } : null
  return PHONE_PATTERN.test(trimmed) ? { type: 'phone', value: toLogtoPhone(trimmed) } : null
}

/** 單一帳號欄位（信箱或手機）的 Form 驗證規則 */
export function identifierRules(messages: Partial<typeof IDENTIFIER_MESSAGES> = {}): Rule[] {
  const { required, format } = { ...IDENTIFIER_MESSAGES, ...messages }
  return [
    { required: true, whitespace: true, message: required },
    {
      validator: (_, value?: string) =>
        !value?.trim() || parseIdentifier(value) ? Promise.resolve() : Promise.reject(new Error(format)),
    },
  ]
}

/** 顯示用（例如「驗證碼已寄到 0912345678」） */
export const formatIdentifier = (identifier: Identifier) =>
  identifier.type === 'phone' ? fromLogtoPhone(identifier.value) : identifier.value
