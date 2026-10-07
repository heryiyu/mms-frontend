import type { Rule } from 'antd/es/form'
import { getPasswordRuleError } from '../../constants/password'

// 「新密碼／確認密碼」兩欄的 Form 驗證規則（修改密碼、忘記密碼共用）。
// 密碼規則本身在 constants/password.ts（與 MSW mock 共用）；這裡只包成 AntD Form 的 Rule。
// TODO(#12)：錯誤文案設計未定

export const PASSWORD_FORM_MESSAGES = {
  newRequired: '請輸入新密碼',
  confirmRequired: '請確認新密碼',
  mismatch: '兩次輸入的新密碼不一致',
} as const

type GetFieldValue = (name: string) => unknown

/**
 * 新密碼：必填＋密碼規則。extraCheck 可加頁面專屬檢查（回傳錯誤訊息，通過回 undefined），
 * 例：修改密碼的「新密碼不可與舊密碼相同」（記得在 Form.Item 加 dependencies）。
 */
export function newPasswordRules(extraCheck?: (value: string, getFieldValue: GetFieldValue) => string | undefined): Rule[] {
  return [
    { required: true, message: PASSWORD_FORM_MESSAGES.newRequired },
    ({ getFieldValue }) => ({
      validator(_, value?: string) {
        if (!value) return Promise.resolve()
        const error = getPasswordRuleError(value) ?? extraCheck?.(value, getFieldValue)
        return error ? Promise.reject(new Error(error)) : Promise.resolve()
      },
    }),
  ]
}

/** 確認密碼：必填＋與新密碼欄一致。Form.Item 需加 dependencies={[newPasswordField]} */
export function confirmPasswordRules(newPasswordField = 'newPassword'): Rule[] {
  return [
    { required: true, message: PASSWORD_FORM_MESSAGES.confirmRequired },
    ({ getFieldValue }) => ({
      validator(_, value?: string) {
        if (!value || value === getFieldValue(newPasswordField)) return Promise.resolve()
        return Promise.reject(new Error(PASSWORD_FORM_MESSAGES.mismatch))
      },
    }),
  ]
}
