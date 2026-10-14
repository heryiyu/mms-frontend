import { Form } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getApiErrorMessage, getValidationFields, isApiError } from '../../api/client'
import { resetPassword, sendForgotPasswordOtp, verifyForgotPasswordOtp } from '../../api/password'
import type { ForgotPasswordOtpRequest } from '../../api/types'
import { AppForm, applyServerFieldErrors, emailRules, phoneRules, TextInput } from '../../components/form'
import { type NotifyOptions, useNotifyModal } from '../../components/NoticeModal'
import { getOtpErrorMessage, useOtpForm } from '../../components/OtpInput'
import { useGuestLayout } from '../../layouts/guestLayoutContext'
import { PATHS } from '../../routes/paths'
import styles from './ForgotPassword.module.css'
import ForgotPasswordCard from './ForgotPasswordCard'
import NewPasswordForm, { type NewPasswordValues } from './NewPasswordForm'
import OtpConfirmFields from './OtpConfirmFields'

// 忘記密碼（issue #18，docs/design/forgot-password/README.md）。登入頁「忘記密碼？」進入。
// 卡片外框、OTP 列＋「確認」、設定新密碼表單、完成頁和 SSO 登入頁的忘記密碼（src/sso/pages/ResetPassword.tsx）共用（#47 D12）。
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
  accountNotFound: '查無此帳號',
  emailPhoneMismatch: '電子信箱與手機號碼不符',
  tokenInvalid: '驗證已逾時\n請重新驗證',
  failed: '發生錯誤，請稍後再試',
} as const

const EMAIL_RULES = emailRules()
const PHONE_RULES = phoneRules()

/** 其他錯誤的通知彈窗：後端沒給 code（例如 5xx）時不顯示「API 502」這類技術訊息 */
function getNotice(error: unknown): NotifyOptions {
  const otpMessage = getOtpErrorMessage(error)
  if (otpMessage) return { title: NOTICE_TITLE, content: otpMessage }
  if (isApiError(error, 'ACCOUNT_NOT_FOUND')) return { title: NOTICE_TITLE, content: MESSAGES.accountNotFound }
  if (isApiError(error, 'EMAIL_PHONE_MISMATCH')) return { title: NOTICE_TITLE, content: MESSAGES.emailPhoneMismatch }
  return { title: NOTICE_TITLE, content: getApiErrorMessage(error, MESSAGES.failed) }
}

export default function ForgotPassword() {
  useGuestLayout('card')
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ name: 'verify' })
  const { notify, contextHolder } = useNotifyModal()

  return (
    <ForgotPasswordCard>
      {contextHolder}
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
    </ForgotPasswordCard>
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
  const [verifying, setVerifying] = useState(false)

  const otp = useOtpForm(form, sendForgotPasswordOtp, {
    targetFields: ['email', 'phone'],
    onResendError: (error) => void notify(getNotice(error)),
  })

  const filled = !!email?.trim() && !!phone?.trim()
  const canSubmit = filled && (!otp.sent || otp.otpFilled)

  const showError = (error: unknown) => {
    if (applyServerFieldErrors(form, error, ['email', 'phone', 'otp']).length > 0) return
    void notify(getNotice(error))
  }

  const send = async ({ email, phone }: ForgotPasswordOtpRequest) => {
    try {
      await otp.send({ email: email.trim(), phone: phone.trim() })
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
      if (getOtpErrorMessage(error)) otp.clearOtp()
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
      onValuesChange={otp.handleValuesChange}
    >
      <Form.Item name="email" className={styles.field} rules={EMAIL_RULES}>
        <TextInput
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="請輸入電子信箱"
          aria-label="電子信箱"
          maxLength={254}
        />
      </Form.Item>
      <Form.Item name="phone" className={styles.field} rules={PHONE_RULES}>
        <TextInput type="tel" inputMode="tel" autoComplete="tel" placeholder="請輸入手機號碼" aria-label="手機號碼" maxLength={10} />
      </Form.Item>
      <OtpConfirmFields otp={otp} canSubmit={canSubmit} loading={otp.sending || verifying} />
    </AppForm>
  )
}

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
  const [form] = Form.useForm<NewPasswordValues>()
  const [submitting, setSubmitting] = useState(false)

  const handleFinish = async ({ newPassword }: NewPasswordValues) => {
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
      const fieldError = getValidationFields(error).newPassword
      if (fieldError) {
        form.setFields([{ name: 'newPassword', errors: [fieldError] }])
        return
      }
      void notify(getNotice(error))
    }
  }

  return <NewPasswordForm form={form} onFinish={handleFinish} submitting={submitting} />
}
