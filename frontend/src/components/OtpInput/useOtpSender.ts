import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { OtpSendResponse } from '../../api/types'
import { OTP_DEFAULT_LENGTH, toOtpExpiresAt } from '../../constants/otp'

export interface UseOtpSenderOptions {
  /** 重新發送失敗時呼叫（例如跳通知彈窗）；沒提供時錯誤會往外丟 */
  onResendError?: (error: unknown) => void
  /** 覆寫有效秒數（開發示範測倒數用）；正式流程不要傳，以 API 回傳的 expiresIn 為準 */
  expiresInOverride?: number
}

export interface OtpSender<TBody> {
  /** 呼叫發送 API；成功後開始倒數。失敗會丟出 ApiError，由呼叫端顯示錯誤 */
  send: (body: TBody) => Promise<OtpSendResponse>
  /** 用上一次 send 的內容重新發送（給 OtpField 的 onResend）；成功回 true，失敗且有 onResendError 時回 false */
  resend: () => Promise<boolean>
  /** 回到尚未發送的狀態（例如使用者改了信箱／手機） */
  reset: () => void
  /** 發送／重新發送中 */
  sending: boolean
  /** 是否已成功發送過（可用來決定要不要顯示 OTP 列） */
  sent: boolean
  /** 到期時間（epoch ms），給 OtpField 的 expiresAt */
  expiresAt: number | null
  /** 驗證碼位數（API 回傳，沒給時用預設值），給 OtpField 的 length 與 otpRules */
  length: number
}

/**
 * 管理「發送 OTP → 倒數 → 重新發送」的狀態，4 個流程共用。sendFn 傳 src/api 的發送函式：
 * sendRegisterOtp、sendForgotPasswordOtp、sendProfileChangeOtp、sendReceiptOtp。
 *
 *   const otp = useOtpSender(sendForgotPasswordOtp, { onResendError: (e) => notify(...) })
 *   await otp.send({ email, phone })
 *   <OtpField length={otp.length} expiresAt={otp.expiresAt} onResend={otp.resend} />
 */
export function useOtpSender<TBody>(
  sendFn: (body: TBody) => Promise<OtpSendResponse>,
  options: UseOtpSenderOptions = {},
): OtpSender<TBody> {
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [length, setLength] = useState(OTP_DEFAULT_LENGTH)
  const [sending, setSending] = useState(false)
  const lastBodyRef = useRef<{ body: TBody } | null>(null)
  // 呼叫端常傳 inline 函式／物件，用 ref 取最新值，讓 send／resend 參照穩定
  const sendFnRef = useRef(sendFn)
  const optionsRef = useRef(options)
  useLayoutEffect(() => {
    sendFnRef.current = sendFn
    optionsRef.current = options
  })

  const send = useCallback(async (body: TBody) => {
    setSending(true)
    try {
      const res = await sendFnRef.current(body)
      lastBodyRef.current = { body }
      setLength(res.length || OTP_DEFAULT_LENGTH)
      setExpiresAt(toOtpExpiresAt(optionsRef.current.expiresInOverride ?? res.expiresIn))
      return res
    } finally {
      setSending(false)
    }
  }, [])

  const resend = useCallback(async () => {
    const last = lastBodyRef.current
    if (!last) return false
    try {
      await send(last.body)
      return true
    } catch (error) {
      const onError = optionsRef.current.onResendError
      if (!onError) throw error
      onError(error)
      return false
    }
  }, [send])

  const reset = useCallback(() => {
    lastBodyRef.current = null
    setExpiresAt(null)
    setLength(OTP_DEFAULT_LENGTH)
  }, [])

  return { send, resend, reset, sending, sent: expiresAt !== null, expiresAt, length }
}
