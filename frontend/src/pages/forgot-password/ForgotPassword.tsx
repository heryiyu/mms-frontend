import { Form } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { isApiError } from '../../api/client'
import { resetPassword, sendForgotPasswordOtp, verifyForgotPasswordOtp } from '../../api/password'
import type { ForgotPasswordOtpRequest } from '../../api/types'
import { Button } from '../../components/Button'
import {
  AppForm,
  confirmPasswordRules,
  FormCard,
  FormCardItem,
  formCardLayout,
  newPasswordRules,
  PasswordInput,
  TextInput,
} from '../../components/form'
import { type NotifyOptions, useNotifyModal } from '../../components/NoticeModal'
import { getOtpErrorMessage, OtpField, otpRules, useOtpSender } from '../../components/OtpInput'
import { useGuestLayout } from '../../layouts/guestLayoutContext'
import { PATHS } from '../../routes/paths'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import styles from './ForgotPassword.module.css'

// 忘記密碼（issue #18，docs/design/forgot-password/README.md）。登入頁「忘記密碼？」進入。
// 同一路由內切換步驟（GuestLayout 卡片）：
//   verify：default（信箱＋手機，兩欄都填才可按「確認」）→ ing → 按「確認」發送 OTP
//           → otp（出現 OTP 列＋倒數）→ 按「確認」驗證 OTP，取得 resetToken
//   reset： re（新密碼／確認密碼，左標籤＋右欄位）→ re-ing → 按「確認」送出
//   完成：導向 PATHS.forgotPasswordDone（整頁「變更完成！」，「返回」回登入頁）
//
// TODO(#12)：以下為設計未定、先依推測實作——
// - 卡片上沒有「返回／回登入」連結（照稿不加），中途離開只能用瀏覽器上一頁
// - 錯誤狀態都沒畫：伺服器回傳的錯誤沿用登入頁的「通知」彈窗；欄位格式、兩次密碼不一致等用 inline 訊息
// - 送出時的 loading 沒畫：用按鈕 loading，未沿用登入頁的 Logo 遮罩
// - 「已發送 OTP、但還沒填」的狀態沒畫：OTP 未填滿前「確認」停用（與 default 一致）
// - 密碼規則沒寫：沿用 constants/password.ts（與修改密碼共用）
// - Line 建立、沒有設定過密碼的帳號能否走這個流程，由後端決定

type Step = { name: 'verify' } | { name: 'reset'; resetToken: string }

const NOTICE_TITLE = '通知'

// TODO(#12)：錯誤文案設計未定
const MESSAGES = {
  emailRequired: '請輸入電子信箱',
  emailInvalid: '電子信箱格式錯誤',
  phoneRequired: '請輸入手機號碼',
  phoneInvalid: '手機號碼格式錯誤',
  accountNotFound: '查無此帳號',
  emailPhoneMismatch: '電子信箱與手機號碼不符',
  tokenInvalid: '驗證已逾時\n請重新驗證',
  failed: '發生錯誤，請稍後再試',
} as const

/** 台灣手機：09 開頭共 10 碼（與 mock 的 assertEmailPhone 一致）。TODO(#12)：是否接受國際號碼待確認 */
const PHONE_PATTERN = /^09\d{8}$/

/** 後端 VALIDATION_ERROR 的欄位錯誤（{ fields: { email: '…' } }） */
function getFieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error, 'VALIDATION_ERROR')) return {}
  return (error.data as { fields?: Record<string, string> } | undefined)?.fields ?? {}
}

/** 其他錯誤的通知彈窗：後端沒給 code（例如 5xx）時不顯示「API 502」這類技術訊息 */
function getNotice(error: unknown): NotifyOptions {
  const otpMessage = getOtpErrorMessage(error)
  if (otpMessage) return { title: NOTICE_TITLE, content: otpMessage }
  if (isApiError(error, 'ACCOUNT_NOT_FOUND')) return { title: NOTICE_TITLE, content: MESSAGES.accountNotFound }
  if (isApiError(error, 'EMAIL_PHONE_MISMATCH')) return { title: NOTICE_TITLE, content: MESSAGES.emailPhoneMismatch }
  const known = isApiError(error) && error.code !== 'UNKNOWN'
  return { title: NOTICE_TITLE, content: known ? error.message : MESSAGES.failed }
}

export default function ForgotPassword() {
  useGuestLayout('card')
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ name: 'verify' })
  const { notify, contextHolder } = useNotifyModal()

  return (
    <div className={styles.page}>
      {contextHolder}
      <h1 className={cx(typography.headline5, styles.title)}>忘記密碼</h1>
      {step.name === 'verify' ? (
        <VerifyStep notify={notify} onVerified={(resetToken) => setStep({ name: 'reset', resetToken })} />
      ) : (
        <ResetStep
          resetToken={step.resetToken}
          notify={notify}
          onDone={() => navigate(PATHS.forgotPasswordDone, { replace: true })}
          onTokenInvalid={() => setStep({ name: 'verify' })}
        />
      )}
    </div>
  )
}

type Notify = (options: NotifyOptions) => Promise<boolean>

interface VerifyValues extends ForgotPasswordOtpRequest {
  otp: string
}

function VerifyStep({ notify, onVerified }: { notify: Notify; onVerified: (resetToken: string) => void }) {
  const [form] = Form.useForm<VerifyValues>()
  const email = Form.useWatch('email', form)
  const phone = Form.useWatch('phone', form)
  const otpValue = Form.useWatch('otp', form) ?? ''
  const [verifying, setVerifying] = useState(false)

  const otp = useOtpSender(sendForgotPasswordOtp, { onResendError: (error) => void notify(getNotice(error)) })

  const filled = !!email?.trim() && !!phone?.trim()
  const canSubmit = filled && (!otp.sent || otpValue.length === otp.length)

  const showError = (error: unknown) => {
    const fields = getFieldErrors(error)
    const matched = (['email', 'phone', 'otp'] as const).filter((name) => fields[name])
    if (matched.length > 0) {
      form.setFields(matched.map((name) => ({ name, errors: [fields[name]] })))
      return
    }
    void notify(getNotice(error))
  }

  const send = async ({ email, phone }: ForgotPasswordOtpRequest) => {
    try {
      await otp.send({ email: email.trim(), phone: phone.trim() })
      form.setFieldValue('otp', '')
    } catch (error) {
      showError(error)
    }
  }

  const verify = async ({ email, phone, otp: code }: VerifyValues) => {
    setVerifying(true)
    try {
      const { resetToken } = await verifyForgotPasswordOtp({ email: email.trim(), phone: phone.trim(), otp: code })
      onVerified(resetToken)
    } catch (error) {
      setVerifying(false)
      // 驗證碼錯誤／逾時：清空讓使用者重新輸入（逾時可等倒數結束後「重新發送」）
      if (getOtpErrorMessage(error)) form.setFieldValue('otp', '')
      showError(error)
    }
  }

  return (
    <AppForm<VerifyValues>
      form={form}
      requiredMark={false}
      validateTrigger="onBlur"
      className={styles.form}
      onFinish={(values) => (otp.sent ? verify(values) : send(values))}
      // 已發送後改了信箱或手機：原本的驗證碼作廢，回到「尚未發送」，按「確認」重新發送。TODO(#12)：設計未畫
      onValuesChange={(changed: Partial<VerifyValues>) => {
        if (otp.sent && ('email' in changed || 'phone' in changed)) otp.reset()
      }}
    >
      <Form.Item
        name="email"
        className={styles.field}
        rules={[
          { required: true, whitespace: true, message: MESSAGES.emailRequired },
          { type: 'email', message: MESSAGES.emailInvalid, transform: (value?: string) => value?.trim() },
        ]}
      >
        <TextInput
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="請輸入電子信箱"
          aria-label="電子信箱"
          maxLength={254}
        />
      </Form.Item>
      <Form.Item
        name="phone"
        className={styles.field}
        rules={[
          { required: true, whitespace: true, message: MESSAGES.phoneRequired },
          { pattern: PHONE_PATTERN, message: MESSAGES.phoneInvalid, transform: (value?: string) => value?.trim() },
        ]}
      >
        <TextInput type="tel" inputMode="tel" autoComplete="tel" placeholder="請輸入手機號碼" aria-label="手機號碼" maxLength={10} />
      </Form.Item>
      {otp.sent && (
        <Form.Item name="otp" className={styles.field} rules={otpRules(otp.length)}>
          <OtpField length={otp.length} expiresAt={otp.expiresAt} onResend={otp.resend} autoFocus />
        </Form.Item>
      )}
      <Button
        htmlType="submit"
        block
        className={styles.submit}
        disabled={!canSubmit}
        loading={otp.sending || verifying}
      >
        確認
      </Button>
    </AppForm>
  )
}

interface ResetValues {
  newPassword: string
  confirmPassword: string
}

const newPasswordFieldRules = newPasswordRules()
const confirmPasswordFieldRules = confirmPasswordRules('newPassword')

function ResetStep({
  resetToken,
  notify,
  onDone,
  onTokenInvalid,
}: {
  resetToken: string
  notify: Notify
  onDone: () => void
  onTokenInvalid: () => void
}) {
  const [form] = Form.useForm<ResetValues>()
  const [submitting, setSubmitting] = useState(false)

  const handleFinish = async ({ newPassword }: ResetValues) => {
    setSubmitting(true)
    try {
      await resetPassword({ resetToken, newPassword })
      onDone()
    } catch (error) {
      setSubmitting(false)
      if (isApiError(error, 'TOKEN_INVALID')) {
        // resetToken 失效或已用過：通知後回到第一步重新驗證
        await notify({ title: NOTICE_TITLE, content: MESSAGES.tokenInvalid })
        onTokenInvalid()
        return
      }
      const fieldError = getFieldErrors(error).newPassword
      if (fieldError) {
        form.setFields([{ name: 'newPassword', errors: [fieldError] }])
        return
      }
      void notify(getNotice(error))
    }
  }

  return (
    <AppForm<ResetValues>
      form={form}
      requiredMark={false}
      validateTrigger="onBlur"
      className={styles.form}
      {...formCardLayout}
      onFinish={handleFinish}
    >
      <FormCard className={styles.rows}>
        <FormCardItem name="newPassword" label="新密碼" className={styles.row} rules={newPasswordFieldRules}>
          <PasswordInput placeholder="請輸入新密碼" autoComplete="new-password" autoFocus />
        </FormCardItem>
        <FormCardItem
          name="confirmPassword"
          label="確認密碼"
          className={styles.row}
          dependencies={['newPassword']}
          rules={confirmPasswordFieldRules}
        >
          <PasswordInput placeholder="請確認新密碼" autoComplete="new-password" />
        </FormCardItem>
      </FormCard>
      {/* 稿上欄位空白時「確認」已是啟用樣式，照稿不停用；未填按下會顯示 inline 必填訊息。TODO(#12)：是否改成填完才啟用 */}
      <Button htmlType="submit" block className={cx(styles.submit, styles.resetSubmit)} loading={submitting}>
        確認
      </Button>
    </AppForm>
  )
}
