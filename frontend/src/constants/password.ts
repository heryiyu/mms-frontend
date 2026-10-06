// 密碼規則（前端表單驗證與 MSW mock 共用的唯一來源）
// TODO(#12)：設計稿未定義密碼規則與提示文案（docs/design/change-password/README.md「待確認」），
// 暫定「至少 8 碼，且同時包含英文與數字」。後端定案後只需改這個檔案。

export interface PasswordRule {
  /** 回傳 true 代表符合 */
  test: (password: string) => boolean
  message: string
}

export const PASSWORD_MIN_LENGTH = 8

/** 不符規則時的統一提示文案 */
export const PASSWORD_RULE_MESSAGE = `密碼至少 ${PASSWORD_MIN_LENGTH} 碼，且需包含英文與數字`

export const PASSWORD_RULES: PasswordRule[] = [
  { test: (pw) => pw.length >= PASSWORD_MIN_LENGTH, message: PASSWORD_RULE_MESSAGE },
  { test: (pw) => /[A-Za-z]/.test(pw), message: PASSWORD_RULE_MESSAGE },
  { test: (pw) => /\d/.test(pw), message: PASSWORD_RULE_MESSAGE },
]

/** 回傳第一條不符合的規則訊息；全部符合回傳 undefined */
export function getPasswordRuleError(password: string): string | undefined {
  return PASSWORD_RULES.find((rule) => !rule.test(password))?.message
}
