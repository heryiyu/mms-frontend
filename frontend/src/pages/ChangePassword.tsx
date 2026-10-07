import { Form } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { logout } from '../api/auth'
import { getApiErrorMessage, isApiError } from '../api/client'
import { changePassword } from '../api/password'
import ActionBar from '../components/ActionBar'
import {
  AppForm,
  applyServerFieldErrors,
  confirmPasswordRules,
  FormCard,
  FormCardItem,
  formCardLayout,
  newPasswordRules,
  PasswordInput,
} from '../components/form'
import { useNotifyModal } from '../components/NoticeModal'
import ResultPage from '../components/ResultPage'
import { PATHS } from '../routes/paths'
import typography from '../styles/typography.module.css'
import { cx } from '../utils/cx'
import { hasInAppHistory } from '../utils/history'
import styles from './ChangePassword.module.css'

// 修改密碼（issue #22，docs/design/change-password/README.md）
// 狀態流程：輸入中（三欄皆有值才可送出）→ 變更完成（結果頁）→ 強制重新登入
//
// 已確認（#12）：
// - P1 第一欄標籤由稿上的「密碼」改為「目前密碼」
// - P2 變更完成後強制重新登入：結果頁按鈕為「重新登入」，離開結果頁（含點選單）一律登出
// - P3 已輸入內容時按「取消／返回」，先確認是否放棄
// - P4 欄位錯誤顯示在輸入框下方；其餘錯誤用通知彈窗

interface ChangePasswordValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type FieldName = keyof ChangePasswordValues

const FIELD_NAMES: FieldName[] = ['currentPassword', 'newPassword', 'confirmPassword']

const MESSAGES = {
  currentRequired: '請輸入目前密碼',
  sameAsOld: '新密碼不可與舊密碼相同',
  wrongCurrent: '密碼輸入錯誤',
  failedTitle: '變更失敗',
  failedContent: '發生錯誤，請稍後再試',
  doneDescription: '請使用新密碼重新登入',
  discardTitle: '注意',
  discardContent: '確定要放棄已輸入的內容嗎？',
  discardCancel: '取消',
} as const

// 新密碼／確認密碼規則與忘記密碼共用（components/form/passwordRules.ts），這裡只多「不可與舊密碼相同」
const newPasswordFieldRules = newPasswordRules((value, getFieldValue) =>
  value === getFieldValue('currentPassword') ? MESSAGES.sameAsOld : undefined,
)

const confirmPasswordFieldRules = confirmPasswordRules('newPassword')

export default function ChangePassword() {
  const navigate = useNavigate()
  const [form] = Form.useForm<ChangePasswordValues>()
  const values = Form.useWatch([], form) as Partial<ChangePasswordValues> | undefined
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  const allFilled = FIELD_NAMES.every((name) => !!values?.[name])
  const anyFilled = FIELD_NAMES.some((name) => !!values?.[name])

  // 密碼已變更：只登出一次（按「重新登入」與離開結果頁都會呼叫）
  const loggedOutRef = useRef(false)
  const forceLogout = () => {
    if (loggedOutRef.current) return Promise.resolve()
    loggedOutRef.current = true
    return logout()
  }

  // 變更完成後從選單等處離開結果頁，也一律登出
  useEffect(() => {
    if (!done) return
    return () => void forceLogout().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps -- forceLogout 只讀 ref，不需重新訂閱
  }, [done])

  const handleRelogin = async () => {
    try {
      await forceLogout()
    } finally {
      navigate(PATHS.login, { replace: true })
    }
  }

  // 有站內上一頁就回上一頁，直接開啟此頁時回首頁；已輸入內容時先確認放棄
  const handleCancel = async () => {
    if (anyFilled) {
      const confirmed = await notify({
        title: MESSAGES.discardTitle,
        content: MESSAGES.discardContent,
        cancelText: MESSAGES.discardCancel,
      })
      if (!confirmed) return
    }
    if (hasInAppHistory()) navigate(-1)
    else navigate(PATHS.home, { replace: true })
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
      if (applyServerFieldErrors(form, error, FIELD_NAMES).length > 0) return
      void notify({ title: MESSAGES.failedTitle, content: getApiErrorMessage(error, MESSAGES.failedContent) })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <ResultPage
        title="變更完成！"
        description={MESSAGES.doneDescription}
        backText="重新登入"
        onBack={() => void handleRelogin()}
      />
    )
  }

  return (
    <div className={styles.page}>
      {contextHolder}
      <AppForm<ChangePasswordValues>
        form={form}
        className={styles.form}
        requiredMark={false}
        validateTrigger="onBlur"
        {...formCardLayout}
        onFinish={handleFinish}
      >
        <h1 className={cx(typography.pageTitle, styles.title)}>修改密碼</h1>
        <FormCard className={styles.card}>
          <FormCardItem
            name="currentPassword"
            label="目前密碼"
            rules={[{ required: true, message: MESSAGES.currentRequired }]}
          >
            <PasswordInput placeholder="請輸入目前密碼" autoComplete="current-password" />
          </FormCardItem>
          <FormCardItem
            name="newPassword"
            label="新密碼"
            dependencies={['currentPassword']}
            rules={newPasswordFieldRules}
          >
            <PasswordInput placeholder="請輸入新密碼" autoComplete="new-password" />
          </FormCardItem>
          <FormCardItem
            name="confirmPassword"
            label="確認密碼"
            dependencies={['newPassword']}
            rules={confirmPasswordFieldRules}
          >
            <PasswordInput placeholder="請確認新密碼" autoComplete="new-password" />
          </FormCardItem>
        </FormCard>
        <ActionBar
          bleed
          onCancel={() => void handleCancel()}
          mobileConfirmText="送出"
          confirmHtmlType="submit"
          confirmDisabled={!allFilled}
          confirmLoading={submitting}
        />
      </AppForm>
    </div>
  )
}
