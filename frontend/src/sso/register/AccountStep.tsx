import { Form } from 'antd'
import type { FormProps } from 'antd'
import { useRef, useState } from 'react'
import { Button } from '../../components/Button'
import { AppForm, TextInput } from '../../components/form'
import { OtpFormItem, useOtpForm } from '../../components/OtpInput'
import { RegisterBackLink, RegisterCard, RegisterDivider } from '../../components/RegisterCard'
import { isExperienceError } from '../api/client'
import type { Identifier } from '../api/experience'
import SocialButtons from '../components/SocialButtons'
import { identifierRules, parseIdentifier } from '../identifier'
import { SSO_PATHS } from '../paths'
import { NOTICE_TITLE, useSsoNotice } from '../useSsoNotice'
import { CODE_INVALIDATED_ERRORS, CODE_MISMATCH_ERRORS, LOGTO_CODE } from '../verificationCode'
import { sendRegisterCode, verifyRegisterCode } from './registerFlow'

// 註冊第一步：帳號（email 或手機擇一）＋驗證碼。畫面同會員中心註冊第一步（RegisterCard、OtpFormItem、SocialLoginButton 共用，#47 D12），
// 設計稿要出生、信箱、手機都填，這裡只要一個帳號（#43）；出生日期等會員資料在第一次登入會員中心時填（#48）。
// Default（按「確認」寄驗證碼）→ ing（驗證碼列＋倒數，未填滿時「確認」停用）→ otp（按「確認」驗證）→ 第二步
//
// TODO(#12)：以下設計稿沒畫，沿用會員中心註冊第一步的做法——
// - 帳號欄位 placeholder、錯誤文案；錯誤一律跳通知彈窗（設計註記「輸入錯誤需跳pop提醒」）
// - 寄出後改了帳號：回到 Default（需重新寄送）；驗證碼過期／錯太多次：回到 Default 重新寄送
// - 「or／使用Line創建帳號」照會員中心：寄出驗證碼後收起；SSO 多一顆 Google（SocialButtons action="register"）

interface AccountValues {
  identifier: string
  otp?: string
}

const IDENTIFIER_RULES = identifierRules()

/** 這些錯誤代表這次寄出的驗證碼不能再用（或帳號已註冊），要回到 Default 重新寄送 */
const RESEND_REQUIRED = [...CODE_INVALIDATED_ERRORS, 'user.email_already_in_use', 'user.phone_already_in_use']

export interface VerifiedAccount {
  identifier: Identifier
  verificationId: string
  /** false：Logto 不要求密碼、姓名（目前設定不會發生），可直接完成註冊 */
  needsProfile: boolean
}

interface AccountStepProps {
  /** 從第二步返回時帶回原本的帳號 */
  initialIdentifier?: string
  onVerified: (account: VerifiedAccount, identifierInput: string) => void
}

export default function AccountStep({ initialIdentifier, onVerified }: AccountStepProps) {
  const [form] = Form.useForm<AccountValues>()
  const [verifying, setVerifying] = useState(false)
  const { notify, notifyError, contextHolder } = useSsoNotice()
  // 寄送時記下帳號與 verificationId（重新發送會換新的），驗證時要用同一組
  const sentRef = useRef<{ identifier: Identifier; verificationId: string } | null>(null)

  const otp = useOtpForm(
    form,
    async (identifier: Identifier) => {
      const { verificationId } = await sendRegisterCode(identifier)
      sentRef.current = { identifier, verificationId }
      return LOGTO_CODE
    },
    { targetFields: ['identifier'], onResendError: (error) => void notifyError(error) },
  )

  const handleSend = async (values: AccountValues) => {
    const identifier = parseIdentifier(values.identifier)
    if (!identifier) return
    try {
      await otp.send(identifier)
    } catch (error) {
      void notifyError(error)
    }
  }

  const handleVerify = async (values: AccountValues) => {
    const sent = sentRef.current
    if (!sent) return
    setVerifying(true)
    try {
      const result = await verifyRegisterCode(sent.identifier, sent.verificationId, values.otp ?? '')
      onVerified({ identifier: sent.identifier, ...result }, values.identifier.trim())
    } catch (error) {
      setVerifying(false)
      if (isExperienceError(error, ...CODE_MISMATCH_ERRORS)) otp.clearOtp()
      if (isExperienceError(error, ...RESEND_REQUIRED)) otp.reset()
      void notifyError(error)
    }
  }

  const handleFinish = (values: AccountValues) => (otp.sent ? handleVerify(values) : handleSend(values))

  const handleFinishFailed: FormProps<AccountValues>['onFinishFailed'] = ({ errorFields }) => {
    const first = errorFields[0]?.errors[0]
    if (first) void notify({ title: NOTICE_TITLE, content: first })
  }

  const busy = otp.sending || verifying

  return (
    <RegisterCard footer={<RegisterBackLink to={SSO_PATHS.signIn} />}>
      {contextHolder}
      <AppForm<AccountValues>
        form={form}
        initialValues={{ identifier: initialIdentifier }}
        requiredMark={false}
        validateTrigger="onBlur"
        onFinish={handleFinish}
        onFinishFailed={handleFinishFailed}
        onValuesChange={otp.handleValuesChange}
        className={RegisterCard.formClassName}
      >
        <Form.Item name="identifier" rules={IDENTIFIER_RULES}>
          <TextInput
            type="text"
            autoComplete="username"
            placeholder="請輸入電子信箱或手機號碼"
            aria-label="電子信箱或手機號碼"
            maxLength={254}
          />
        </Form.Item>

        {otp.sent && <OtpFormItem otp={otp} disabled={verifying} />}

        <Button
          htmlType="submit"
          block
          loading={busy}
          disabled={otp.sent && !otp.otpFilled}
          className={RegisterCard.submitClassName}
        >
          確認
        </Button>
      </AppForm>

      {/* 同會員中心：寄出驗證碼後「or」與社群按鈕收起 */}
      {!otp.sent && (
        <>
          <RegisterDivider />
          <SocialButtons action="register" disabled={busy} />
        </>
      )}
    </RegisterCard>
  )
}
