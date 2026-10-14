import { Form } from 'antd'
import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AppForm, TextInput } from '../../components/form'
import { type NotifyOptions, useNotifyModal } from '../../components/NoticeModal'
import { useOtpForm } from '../../components/OtpInput'
import { useGuestLayout } from '../../layouts/guestLayoutContext'
import ForgotPasswordCard from '../../pages/forgot-password/ForgotPasswordCard'
import forgotStyles from '../../pages/forgot-password/ForgotPassword.module.css'
import NewPasswordForm, { type NewPasswordValues } from '../../pages/forgot-password/NewPasswordForm'
import OtpConfirmFields from '../../pages/forgot-password/OtpConfirmFields'
import PasswordChangedResult from '../../pages/forgot-password/PasswordChangedResult'
import { isExperienceError } from '../api/client'
import { getExperienceErrorMessage } from '../api/errors'
import {
  type Identifier,
  identify,
  initInteraction,
  resetPassword,
  sendVerificationCode,
  submitInteraction,
  verifyCode,
} from '../api/experience'
import { identifierRules, parseIdentifier } from '../identifier'
import { SSO_PATHS } from '../paths'
import { CODE_INVALIDATED_ERRORS, CODE_MISMATCH_ERRORS, LOGTO_CODE } from '../verificationCode'

// 忘記密碼（#57）。first_screen=reset_password、舊路徑 /forgot-password、登入頁「忘記密碼？」都會到這裡（/reset-password）。
// 畫面照會員中心忘記密碼頁（docs/design/forgot-password/README.md），共用 pages/forgot-password 的元件（#47 D12）；
// 差別是帳號改成 email 或手機「擇一」（同一欄，有 @ 當信箱）。步驟都在同一路徑內切換：
//   verify：輸入 email 或手機 →「確認」：initInteraction('ForgotPassword') → sendVerificationCode
//           → OTP 列＋倒數 →「確認」：verifyCode → identify
//   reset： 新密碼／確認密碼 →「確認」：resetPassword → submitInteraction
//   done：  整頁「變更完成！」→「返回」回登入頁（/sign-in）
//
// 完成後不直接 goToRedirect：設計稿是先顯示「變更完成！」再「返回」登入頁，Logto 原本的登入頁也是改完密碼回登入畫面；
// ForgotPassword 的 submit 只會改密碼、清掉這次的驗證紀錄，不會登入，使用者要用新密碼登入後才回到原網站。
//
// TODO(#12)：設計稿沒畫、沿用會員中心忘記密碼頁的做法——
// - 卡片上沒有「返回登入」連結（照稿不加）
// - 錯誤都用「通知」彈窗；欄位格式、兩次密碼不一致、密碼被 SSO 拒絕用 inline 訊息
// - 送出時用按鈕 loading；OTP 未填滿前「確認」停用；已發送後改了帳號要重新發送
// - 密碼規則用 constants/password.ts；SSO 的密碼規則若更嚴，由 SSO 回 password.rejected 顯示在欄位上

const NOTICE_TITLE = '通知'

const MESSAGES = {
  // 改密碼前驗證紀錄不見了（太久沒動作、或在別的分頁重新開始）：回第一步重新驗證。同會員中心 TOKEN_INVALID 的文案
  verificationLost: '驗證已逾時\n請重新驗證',
} as const

/** 新密碼被 SSO 拒絕：標在「新密碼」欄位上 */
const PASSWORD_FIELD_ERRORS = ['user.same_password', 'password.rejected', 'user.password_policy_violation']

/** 改密碼時發現還沒通過驗證：回第一步 */
const VERIFICATION_LOST_ERRORS = ['session.identifier_not_found', 'session.verification_session_not_found']

const IDENTIFIER_RULES = identifierRules()

/** 完成後把「done」記在 location.state：切到整頁版型時 GuestLayout 外框不同，頁面會重新掛載 */
interface ResetPasswordLocationState {
  passwordReset?: boolean
}

type Notify = (options: NotifyOptions) => Promise<boolean>

const notice = (error: unknown): NotifyOptions => ({ title: NOTICE_TITLE, content: getExperienceErrorMessage(error) })

export default function ResetPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const done = (location.state as ResetPasswordLocationState | null)?.passwordReset === true
  useGuestLayout(done ? 'none' : 'card')

  if (done) return <PasswordChangedResult onBack={() => navigate(SSO_PATHS.signIn, { replace: true })} />

  return (
    <ResetPasswordSteps
      onDone={() =>
        navigate(
          { pathname: location.pathname, search: location.search },
          { replace: true, state: { passwordReset: true } satisfies ResetPasswordLocationState },
        )
      }
    />
  )
}

function ResetPasswordSteps({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'verify' | 'reset'>('verify')
  const { notify, contextHolder } = useNotifyModal()

  return (
    <ForgotPasswordCard>
      {contextHolder}
      {step === 'verify' ? (
        <VerifyStep notify={notify} onVerified={() => setStep('reset')} />
      ) : (
        <ResetStep notify={notify} onDone={onDone} onVerificationLost={() => setStep('verify')} />
      )}
    </ForgotPasswordCard>
  )
}

interface VerifyValues {
  identifier: string
  otp?: string
}

function VerifyStep({ notify, onVerified }: { notify: Notify; onVerified: () => void }) {
  const [form] = Form.useForm<VerifyValues>()
  const account = Form.useWatch('identifier', form)
  const [verifying, setVerifying] = useState(false)
  // 這一步開始時（含驗證失效回到這一步）先 initInteraction 一次，清掉先前的驗證紀錄
  const interactionReadyRef = useRef(false)
  const verificationIdRef = useRef<string | null>(null)

  const otp = useOtpForm(
    form,
    async (identifier: Identifier) => {
      if (!interactionReadyRef.current) {
        await initInteraction('ForgotPassword')
        interactionReadyRef.current = true
      }
      const { verificationId } = await sendVerificationCode(identifier, 'ForgotPassword')
      verificationIdRef.current = verificationId
      return LOGTO_CODE
    },
    { targetFields: ['identifier'], onResendError: (error) => void notify(notice(error)) },
  )

  const canSubmit = !!account?.trim() && (!otp.sent || otp.otpFilled)

  const send = async (identifier: Identifier) => {
    try {
      await otp.send(identifier)
    } catch (error) {
      void notify(notice(error))
    }
  }

  const verify = async (identifier: Identifier, code: string) => {
    const sentVerificationId = verificationIdRef.current
    if (!sentVerificationId) return
    setVerifying(true)
    try {
      const { verificationId } = await verifyCode(identifier, sentVerificationId, code)
      await identify(verificationId)
      onVerified()
    } catch (error) {
      setVerifying(false)
      if (isExperienceError(error, ...CODE_MISMATCH_ERRORS)) otp.clearOtp()
      // 驗證碼不能用了、或查無此帳號：回到「尚未發送」，改帳號或直接按「確認」重新發送
      else if (isExperienceError(error, ...CODE_INVALIDATED_ERRORS, 'user.user_not_exist')) otp.reset()
      void notify(notice(error))
    }
  }

  const handleFinish = ({ identifier: value, otp: code }: VerifyValues) => {
    const identifier = parseIdentifier(value)
    if (!identifier) return
    return otp.sent ? verify(identifier, code ?? '') : send(identifier)
  }

  return (
    <AppForm<VerifyValues>
      form={form}
      requiredMark={false}
      validateTrigger="onBlur"
      className={forgotStyles.form}
      onFinish={handleFinish}
      // 已發送後改了帳號：原本的驗證碼作廢，回到「尚未發送」
      onValuesChange={otp.handleValuesChange}
    >
      <Form.Item name="identifier" className={forgotStyles.field} rules={IDENTIFIER_RULES}>
        <TextInput
          inputMode="email"
          autoComplete="username"
          placeholder="請輸入電子信箱或手機號碼"
          aria-label="電子信箱或手機號碼"
          maxLength={254}
          disabled={verifying}
        />
      </Form.Item>
      <OtpConfirmFields otp={otp} canSubmit={canSubmit} loading={otp.sending || verifying} disabled={verifying} />
    </AppForm>
  )
}

function ResetStep({
  notify,
  onDone,
  onVerificationLost,
}: {
  notify: Notify
  onDone: () => void
  onVerificationLost: () => void
}) {
  const [form] = Form.useForm<NewPasswordValues>()
  const [submitting, setSubmitting] = useState(false)

  const handleFinish = async ({ newPassword }: NewPasswordValues) => {
    setSubmitting(true)
    try {
      await resetPassword(newPassword)
      await submitInteraction()
      onDone()
    } catch (error) {
      setSubmitting(false)
      if (isExperienceError(error, ...PASSWORD_FIELD_ERRORS)) {
        form.setFields([{ name: 'newPassword', errors: [getExperienceErrorMessage(error)] }])
        return
      }
      if (isExperienceError(error, ...VERIFICATION_LOST_ERRORS)) {
        await notify({ title: NOTICE_TITLE, content: MESSAGES.verificationLost })
        onVerificationLost()
        return
      }
      void notify(notice(error))
    }
  }

  return <NewPasswordForm form={form} onFinish={handleFinish} submitting={submitting} />
}
