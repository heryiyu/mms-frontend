import { Form } from 'antd'
import OtpField from './OtpField'
import { otpRules } from './otp'
import type { OtpForm } from './useOtpForm'

export interface OtpFormItemProps {
  /** useOtpForm 的回傳值 */
  otp: Pick<OtpForm<never>, 'length' | 'expiresAt' | 'resend'>
  /** 驗證中停用輸入與重新發送 */
  disabled?: boolean
  autoFocus?: boolean
  /** Form.Item 的 className（各卡片的欄位間距，例如 ForgotPasswordCard.fieldClassName） */
  className?: string
}

/**
 * useOtpForm 表單上的 OTP 列（Form.Item name="otp"＋OtpField＋位數驗證），發送後才放進表單。
 * 會員中心註冊、忘記密碼、進度查詢與 SSO 登入頁註冊、忘記密碼共用（#47 D12）。
 *
 *   {otp.sent && <OtpFormItem otp={otp} disabled={verifying} />}
 */
export default function OtpFormItem({ otp, disabled, autoFocus = true, className }: OtpFormItemProps) {
  return (
    <Form.Item name="otp" className={className} rules={otpRules(otp.length)}>
      <OtpField
        length={otp.length}
        expiresAt={otp.expiresAt}
        onResend={otp.resend}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </Form.Item>
  )
}
