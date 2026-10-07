import type { Rule } from 'antd/es/form'
import { ID_NUMBER_PATTERN, PHONE_PATTERN } from '../../constants/validation'

// 信箱／手機／身分證字號欄位的 Form 驗證規則（登入、註冊、忘記密碼、個資修改、奉獻收據共用）。
// 格式本身在 constants/validation.ts（與 MSW mock 共用）；這裡只包成 AntD Form 的 Rule。
// 文案依欄位標籤不同（例：個資修改頁標籤是「信箱」「手機」），各頁可覆寫。TODO(#12)：錯誤文案設計未定

export const FIELD_RULE_MESSAGES = {
  emailRequired: '請輸入電子信箱',
  emailFormat: '電子信箱格式錯誤',
  phoneRequired: '請輸入手機號碼',
  phoneFormat: '手機號碼格式錯誤',
  idNumberRequired: '請輸入身份證字號',
  idNumberFormat: '身份證字號格式錯誤',
} as const

export interface FieldRuleMessages {
  required?: string
  format?: string
}

const trim = (value?: string) => value?.trim()

/** 必填（只有空白也算未填） */
export const requiredRule = (message: string): Rule => ({ required: true, whitespace: true, message })

/** 電子信箱：必填＋格式（前後空白不算錯） */
export function emailRules({
  required = FIELD_RULE_MESSAGES.emailRequired,
  format = FIELD_RULE_MESSAGES.emailFormat,
}: FieldRuleMessages = {}): Rule[] {
  return [requiredRule(required), { type: 'email', message: format, transform: trim }]
}

/** 手機：必填＋ PHONE_PATTERN（前後空白不算錯） */
export function phoneRules({
  required = FIELD_RULE_MESSAGES.phoneRequired,
  format = FIELD_RULE_MESSAGES.phoneFormat,
}: FieldRuleMessages = {}): Rule[] {
  return [requiredRule(required), { pattern: PHONE_PATTERN, message: format, transform: trim }]
}

/** 身分證字號：必填＋ ID_NUMBER_PATTERN（不分大小寫，前後空白不算錯） */
export function idNumberRules({
  required = FIELD_RULE_MESSAGES.idNumberRequired,
  format = FIELD_RULE_MESSAGES.idNumberFormat,
}: FieldRuleMessages = {}): Rule[] {
  return [requiredRule(required), { pattern: ID_NUMBER_PATTERN, message: format, transform: trim }]
}
