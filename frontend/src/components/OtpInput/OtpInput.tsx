import type { ChangeEvent, ClipboardEvent, Key } from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { OTP_DEFAULT_LENGTH } from '../../constants/otp'
import TextInput, { type TextInputProps } from '../form/TextInput'
import { sanitizeOtp } from './otp'

export interface OtpInputProps
  extends Omit<TextInputProps, 'value' | 'defaultValue' | 'onChange' | 'maxLength' | 'type' | 'inputMode'> {
  value?: string
  /** 回傳已整理過的驗證碼（只留數字、全形轉半形、截到 length 位） */
  onChange?: (value: string) => void
  /** 驗證碼位數。TODO(#12)：長度待確認，實際值用發送 API 回傳的 length */
  length?: number
  /** 輸入滿 length 位時呼叫（輸入、貼上、簡訊自動帶入都會觸發），可用來自動送出 */
  onComplete?: (code: string) => void
  /**
   * Android Chrome 的 WebOTP（收到簡訊自動帶入），預設開啟；不支援的瀏覽器會自動略過。
   * iOS／其他瀏覽器靠 autocomplete="one-time-code" 從鍵盤上方建議帶入。
   * TODO(#12)：WebOTP 需要簡訊最後一行為「@網域 #驗證碼」格式，待後端確認簡訊內容。
   */
  webOtp?: boolean
  /** 變更時重新等待簡訊（例如重新發送後）；OtpField 會自動帶入 expiresAt */
  webOtpKey?: Key | null
}

/** WebOTP API 的回傳（TS 內建型別沒有 OTPCredential） */
interface OtpCredentialLike {
  code?: string
}

/**
 * OTP 驗證碼輸入框（issue #5）。設計稿是一般單行輸入框（placeholder「OTP驗證碼」），不是一格一碼，
 * 所以用 TextInput（AntD Input）而非 Input.OTP；樣式、error 狀態與一般輸入框一致。
 * - 只接受數字：輸入、貼上（整串簡訊內容也可以，會抽出數字）、全形數字都會自動整理
 * - 手機鍵盤：inputMode="numeric"＋pattern 叫出數字鍵盤；autocomplete="one-time-code" 讓 iOS 帶入簡訊驗證碼
 * - 可直接放在 Form.Item 內（value／onChange／id／status 由 Form.Item 帶入）
 */
export default function OtpInput({
  value,
  onChange,
  length = OTP_DEFAULT_LENGTH,
  onComplete,
  webOtp = true,
  webOtpKey,
  disabled,
  onPaste,
  placeholder = 'OTP驗證碼',
  ...rest
}: OtpInputProps) {
  const emit = (raw: string) => {
    const next = sanitizeOtp(raw, length)
    onChange?.(next)
    if (next.length === length && next !== value) onComplete?.(next)
  }

  // WebOTP 的回呼在 effect 外非同步觸發，透過 ref 取最新的 emit，避免 effect 因 props 變動而重新等待簡訊
  const emitRef = useRef(emit)
  useLayoutEffect(() => {
    emitRef.current = emit
  })

  useEffect(() => {
    if (!webOtp || disabled || typeof window === 'undefined' || !('OTPCredential' in window)) return
    const controller = new AbortController()
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: controller.signal } as CredentialRequestOptions)
      .then((credential) => {
        const code = (credential as OtpCredentialLike | null)?.code
        if (code) emitRef.current(code)
      })
      // 使用者拒絕、逾時或元件卸載（abort）都不需要處理，手動輸入即可
      .catch(() => {})
    return () => controller.abort()
  }, [webOtp, disabled, webOtpKey])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => emit(e.target.value)

  // 貼上整串（例如「您的驗證碼為 7414」）：抽出數字後整個取代，不受原本內容與游標位置影響
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    onPaste?.(e)
    if (e.defaultPrevented) return
    const text = e.clipboardData.getData('text')
    if (sanitizeOtp(text, length) === '') return
    e.preventDefault()
    emit(text)
  }

  return (
    <TextInput
      {...rest}
      type="text"
      value={value ?? ''}
      onChange={handleChange}
      onPaste={handlePaste}
      disabled={disabled}
      placeholder={placeholder}
      // 不設 maxLength：瀏覽器會在貼上時先截斷原始字串，導致「驗證碼：7414」抽不到數字；長度由 sanitizeOtp 控制
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      aria-label={rest['aria-label'] ?? (rest.id ? undefined : '驗證碼')}
    />
  )
}
