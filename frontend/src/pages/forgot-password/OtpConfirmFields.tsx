import { Form } from 'antd'
import { Button } from '../../components/Button'
import { OtpField, type OtpForm, otpRules } from '../../components/OtpInput'
import styles from './ForgotPassword.module.css'

/**
 * 忘記密碼第一步的下半部（docs/design/forgot-password/README.md default／ing／otp）：
 * 已發送驗證碼後出現的 OTP 列（name 固定為 otp，搭配 useOtpForm）＋「確認」。
 * 上方的帳號欄位各頁不同（會員中心：信箱＋手機；SSO：信箱或手機擇一），由呼叫端放在這個元件前面。
 * 會員中心（ForgotPassword.tsx）與 SSO 登入頁（src/sso/pages/ResetPassword.tsx）共用（#47 D12）。
 */
export default function OtpConfirmFields({
  otp,
  canSubmit,
  loading,
  disabled,
}: {
  otp: Pick<OtpForm<never>, 'sent' | 'length' | 'expiresAt' | 'resend'>
  /** 「確認」是否可按（例：欄位都填了、已發送時驗證碼也填滿） */
  canSubmit: boolean
  /** 發送或驗證中：「確認」顯示 loading */
  loading?: boolean
  /** 驗證中停用 OTP 輸入與重新發送 */
  disabled?: boolean
}) {
  return (
    <>
      {otp.sent && (
        <Form.Item name="otp" className={styles.field} rules={otpRules(otp.length)}>
          <OtpField length={otp.length} expiresAt={otp.expiresAt} onResend={otp.resend} disabled={disabled} autoFocus />
        </Form.Item>
      )}
      <Button htmlType="submit" block className={styles.submit} disabled={!canSubmit} loading={loading}>
        確認
      </Button>
    </>
  )
}
