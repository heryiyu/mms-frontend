import { Flex, theme } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import { OTP_DEFAULT_LENGTH } from '../../constants/otp'
import OtpCountdown, { type OtpCountdownProps } from './OtpCountdown'
import OtpInput, { type OtpInputProps } from './OtpInput'
import styles from './OtpInput.module.css'

export interface OtpFieldProps
  extends Pick<OtpCountdownProps, 'expiresAt' | 'onExpire' | 'renderTimer' | 'expiredText' | 'resendText'> {
  /** 驗證碼（受控）；放在 Form.Item 內時由 Form.Item 帶入 */
  value?: string
  onChange?: (value: string) => void
  /** Form.Item 帶入的 id，讓 label 對到輸入框 */
  id?: string
  /** 驗證碼位數，預設 4。TODO(#12)：長度待確認，請帶發送 API 回傳的 length */
  length?: number
  /** 輸入滿 length 位時呼叫 */
  onComplete?: (code: string) => void
  /**
   * 倒數結束後點「重新發送」時呼叫（可回傳 Promise，期間按鈕 loading）。
   * 呼叫端負責重新呼叫發送 API、更新 expiresAt、顯示錯誤；未提供時到期後只顯示「驗證碼已逾時」。
   */
  onResend?: () => unknown
  /** 重新發送成功（onResend 沒有 reject、也沒回傳 false）後清空已輸入的驗證碼，預設 true */
  clearOnResend?: boolean
  /** 停用輸入框與重新發送 */
  disabled?: boolean
  /**
   * 錯誤狀態：true 只把輸入框標成 error；傳文字時另外在下方顯示訊息（單獨使用、未放在 Form.Item 時）。
   * 放在 Form.Item 內時請用 rules／form.setFields，Form.Item 會自動帶入 error 狀態與訊息。
   * TODO(#12)：驗證碼錯誤的提示樣式與文案未定，註冊稿註記推測用通知彈窗。
   */
  error?: ReactNode
  placeholder?: string
  autoFocus?: boolean
  /** 其他要傳給輸入框的 props（name、onBlur、aria-* 等） */
  inputProps?: Omit<OtpInputProps, 'value' | 'onChange' | 'length' | 'onComplete' | 'disabled' | 'id'>
  className?: string
  style?: CSSProperties
}

/**
 * OTP 列（issue #5）：左「OTP驗證碼」輸入框＋右「有效時間m：ss」倒數框，左右等寬並排；
 * 倒數結束後右側換成「重新發送」。註冊、忘記密碼、個資修改、奉獻收據共用。
 *
 *   const otp = useOtpSender(sendReceiptOtp)
 *   <Form.Item name="otp" rules={otpRules(otp.length)}>
 *     <OtpField length={otp.length} expiresAt={otp.expiresAt} onResend={otp.resend} />
 *   </Form.Item>
 */
export default function OtpField({
  value,
  onChange,
  id,
  length = OTP_DEFAULT_LENGTH,
  onComplete,
  expiresAt,
  onResend,
  onExpire,
  clearOnResend = true,
  disabled,
  error,
  placeholder,
  autoFocus,
  renderTimer,
  expiredText,
  resendText,
  inputProps,
  className,
  style,
}: OtpFieldProps) {
  const { token } = theme.useToken()
  const message = error === true || error === false ? null : error

  const handleResend = onResend
    ? async () => {
        // 回傳 false 代表重新發送失敗（例如 useOtpSender 的 onResendError 已處理），不清空輸入
        const result = await onResend()
        if (clearOnResend && result !== false) onChange?.('')
      }
    : undefined

  return (
    <div className={className} style={style}>
      <Flex gap="middle" className={styles.row}>
        <div className={styles.cell}>
          <OtpInput
            {...inputProps}
            id={id}
            value={value}
            onChange={onChange}
            length={length}
            onComplete={onComplete}
            disabled={disabled}
            placeholder={placeholder}
            autoFocus={autoFocus}
            // 沒有 error 時不傳 status，保留 Form.Item 帶入的驗證狀態
            status={error ? 'error' : inputProps?.status}
            webOtpKey={expiresAt}
          />
        </div>
        {/* 外層包一層 cell：按鈕有左右 padding，直接當 flex item 會比輸入框寬 */}
        <div className={styles.cell}>
          <OtpCountdown
            expiresAt={expiresAt}
            onResend={handleResend}
            onExpire={onExpire}
            disabled={disabled}
            renderTimer={renderTimer}
            expiredText={expiredText}
            resendText={resendText}
          />
        </div>
      </Flex>
      {message && (
        <div
          className={styles.error}
          style={{ '--otp-error-margin-top': `${token.marginXXS}px` } as CSSProperties}
          role="alert"
        >
          {message}
        </div>
      )}
    </div>
  )
}
