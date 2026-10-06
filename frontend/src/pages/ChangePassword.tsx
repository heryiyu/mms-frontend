import { Form } from 'antd'
import type { Rule } from 'antd/es/form'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { isApiError } from '../api/client'
import { changePassword } from '../api/password'
import ActionBar from '../components/ActionBar'
import { AppForm, PasswordInput } from '../components/form'
import { useNotifyModal } from '../components/NoticeModal'
import ResultPage from '../components/ResultPage'
import { getPasswordRuleError } from '../constants/password'
import { PATHS } from '../routes/paths'
import typography from '../styles/typography.module.css'
import { formControlSize } from '../theme/components/formControls'
import { cx } from '../utils/cx'
import styles from './ChangePassword.module.css'

// 修改密碼（issue #22，docs/design/change-password/README.md）
// 狀態流程：輸入中（三欄皆有值才可送出）→ 變更完成（結果頁）
//
// TODO(#12)：以下皆為設計未定、先依推測實作——
// - 第一欄 label 稿上只寫「密碼」，語意為目前密碼
// - 錯誤狀態未出圖：欄位錯誤顯示在輸入框下方；其餘錯誤用通知彈窗
// - 變更完成後是否強制重新登入、「返回」導向哪裡（暫回首頁）
// - 「取消／返回」是否要確認放棄已輸入內容（暫不確認）

interface ChangePasswordValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type FieldName = keyof ChangePasswordValues

const FIELD_NAMES: FieldName[] = ['currentPassword', 'newPassword', 'confirmPassword']

// TODO(#12)：錯誤文案設計未定
const MESSAGES = {
  currentRequired: '請輸入密碼',
  newRequired: '請輸入新密碼',
  confirmRequired: '請確認新密碼',
  sameAsOld: '新密碼不可與舊密碼相同',
  mismatch: '兩次輸入的新密碼不一致',
  wrongCurrent: '密碼輸入錯誤',
  failedTitle: '變更失敗',
  failedContent: '發生錯誤，請稍後再試',
} as const

const newPasswordRules: Rule[] = [
  { required: true, message: MESSAGES.newRequired },
  ({ getFieldValue }) => ({
    validator(_, value?: string) {
      if (!value) return Promise.resolve()
      const ruleError = getPasswordRuleError(value)
      if (ruleError) return Promise.reject(new Error(ruleError))
      if (value === getFieldValue('currentPassword')) return Promise.reject(new Error(MESSAGES.sameAsOld))
      return Promise.resolve()
    },
  }),
]

const confirmPasswordRules: Rule[] = [
  { required: true, message: MESSAGES.confirmRequired },
  ({ getFieldValue }) => ({
    validator(_, value?: string) {
      if (!value || value === getFieldValue('newPassword')) return Promise.resolve()
      return Promise.reject(new Error(MESSAGES.mismatch))
    },
  }),
]

export default function ChangePassword() {
  const navigate = useNavigate()
  const [form] = Form.useForm<ChangePasswordValues>()
  const values = Form.useWatch([], form) as Partial<ChangePasswordValues> | undefined
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  const allFilled = FIELD_NAMES.every((name) => !!values?.[name])

  const goHome = () => navigate(PATHS.home, { replace: true })

  // 有站內上一頁就回上一頁，直接開啟此頁時回首頁
  const handleCancel = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else goHome()
  }

  const setFieldError = (name: FieldName, message: string) => form.setFields([{ name, errors: [message] }])

  const handleFinish = async ({ currentPassword, newPassword }: ChangePasswordValues) => {
    setSubmitting(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setDone(true)
    } catch (error) {
      if (isApiError(error, 'UNAUTHORIZED')) return // client 已統一導回登入頁
      if (isApiError(error, 'WRONG_CURRENT_PASSWORD')) return setFieldError('currentPassword', MESSAGES.wrongCurrent)
      if (isApiError(error, 'PASSWORD_SAME_AS_OLD')) return setFieldError('newPassword', MESSAGES.sameAsOld)
      if (isApiError(error, 'VALIDATION_ERROR')) {
        const fields = (error.data as { fields?: Record<string, string> } | undefined)?.fields ?? {}
        const matched = FIELD_NAMES.filter((name) => fields[name])
        matched.forEach((name) => setFieldError(name, fields[name]))
        if (matched.length > 0) return
      }
      // 後端沒給 code（例如 5xx）時不顯示「API 502」這類技術訊息
      const known = isApiError(error) && error.code !== 'UNKNOWN'
      void notify({ title: MESSAGES.failedTitle, content: known ? error.message : MESSAGES.failedContent })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return <ResultPage title="變更完成！" onBack={goHome} />

  return (
    <div className={styles.page}>
      {contextHolder}
      <AppForm<ChangePasswordValues>
        form={form}
        className={styles.form}
        requiredMark={false}
        validateTrigger="onBlur"
        labelAlign="left"
        labelCol={{ flex: `0 0 ${formControlSize.labelWidth}px` }}
        // 字串 flex 原樣輸出；數字 1 會被轉成「1 1 auto」，xs 時輸入框會被擠到下一行
        wrapperCol={{ flex: '1 1 0' }}
        onFinish={handleFinish}
      >
        <h1 className={cx(typography.pageTitle, styles.title)}>修改密碼</h1>
        <div className={styles.card}>
          <Form.Item
            className={styles.row}
            name="currentPassword"
            label="密碼"
            rules={[{ required: true, message: MESSAGES.currentRequired }]}
          >
            <PasswordInput placeholder="請輸入密碼" autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            className={styles.row}
            name="newPassword"
            label="新密碼"
            dependencies={['currentPassword']}
            rules={newPasswordRules}
          >
            <PasswordInput placeholder="請輸入新密碼" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            className={styles.row}
            name="confirmPassword"
            label="確認密碼"
            dependencies={['newPassword']}
            rules={confirmPasswordRules}
          >
            <PasswordInput placeholder="請確認新密碼" autoComplete="new-password" />
          </Form.Item>
        </div>
        <ActionBar
          bleed
          onCancel={handleCancel}
          mobileConfirmText="送出"
          confirmHtmlType="submit"
          confirmDisabled={!allFilled}
          confirmLoading={submitting}
        />
      </AppForm>
    </div>
  )
}
