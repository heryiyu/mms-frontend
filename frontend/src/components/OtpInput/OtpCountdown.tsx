import { theme } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { cx } from '../../utils/cx'
import Button from '../Button/Button'
import { OTP_MESSAGES } from './otp'
import styles from './OtpInput.module.css'
import { formatCountdown, useCountdown } from './useCountdown'

export interface OtpCountdownProps {
  /** 到期時間（epoch ms）；空值代表尚未發送，倒數框顯示「有效時間-：--」 */
  expiresAt?: number | null
  /**
   * 倒數結束後顯示「重新發送」按鈕，點擊時呼叫。回傳 Promise 時按鈕會顯示 loading 直到完成。
   * 呼叫端負責更新 expiresAt 與顯示錯誤（reject 只會結束 loading）。
   * TODO(#12)：倒數結束後的狀態與「重新發送」設計未畫，暫以次要膠囊按鈕取代倒數框。
   */
  onResend?: () => unknown
  /** 倒數歸零時呼叫一次（換新的 expiresAt 後會重新計算） */
  onExpire?: () => void
  disabled?: boolean
  /** 倒數框文字，預設「有效時間m：ss」 */
  renderTimer?: (remainingSeconds: number) => ReactNode
  /** 到期且沒有 onResend 時倒數框的文字 */
  expiredText?: ReactNode
  /** 重新發送按鈕文字 */
  resendText?: ReactNode
  className?: string
}

const defaultRenderTimer = (seconds: number) => OTP_MESSAGES.timer(formatCountdown(seconds))

/** 有效時間倒數框（灰底、不可編輯）；到期後換成「重新發送」 */
export default function OtpCountdown({
  expiresAt,
  onResend,
  onExpire,
  disabled,
  renderTimer = defaultRenderTimer,
  expiredText = OTP_MESSAGES.timerExpired,
  resendText = OTP_MESSAGES.resend,
  className,
}: OtpCountdownProps) {
  const { token } = theme.useToken()
  const { remaining, expired } = useCountdown(expiresAt)
  const [resending, setResending] = useState(false)

  // onExpire 只在「未到期 → 到期」時呼叫一次；用 ref 取最新的 callback，避免父層每次 render 都觸發
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  })
  // 同一個 expiresAt 只通知一次（StrictMode 重跑 effect 時也不重複）
  const notifiedForRef = useRef<number | null>(null)
  useEffect(() => {
    if (!expired || expiresAt == null || notifiedForRef.current === expiresAt) return
    notifiedForRef.current = expiresAt
    onExpireRef.current?.()
  }, [expired, expiresAt])

  const handleResend = async () => {
    if (!onResend || resending) return
    setResending(true)
    try {
      await onResend()
    } catch {
      // 錯誤提示由呼叫端（onResend 內）處理，這裡只負責結束 loading
    } finally {
      setResending(false)
    }
  }

  if (expired && onResend) {
    return (
      <Button variant="secondary" block className={className} loading={resending} disabled={disabled} onClick={handleResend}>
        {resendText}
      </Button>
    )
  }

  const timerStyle = { '--otp-timer-padding-inline': `${token.controlPaddingHorizontal - token.lineWidth}px` } as CSSProperties

  return (
    // 倒數每秒變動，不用 aria-live 以免報讀器一直朗讀；到期時文字改變仍可由使用者自行讀取
    <div className={cx(styles.timer, className)} style={timerStyle} role="timer" aria-disabled>
      {expiresAt == null ? OTP_MESSAGES.timerIdle : expired ? expiredText : renderTimer(remaining)}
    </div>
  )
}
