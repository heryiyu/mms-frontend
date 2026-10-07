import { Form, type FormInstance } from 'antd'
import type { OtpSendResponse } from '../../api/types'
import { type OtpSender, useOtpSender, type UseOtpSenderOptions } from './useOtpSender'

export interface UseOtpFormOptions extends UseOtpSenderOptions {
  /** OTP 綁定的欄位（例：信箱、手機）；發送後改了任一欄，回到尚未發送、需重新發送 */
  targetFields: readonly string[]
}

export interface OtpForm<TBody> extends OtpSender<TBody> {
  /** 發送成功後同時清空 OTP 欄位 */
  send: (body: TBody) => Promise<OtpSendResponse>
  /** OTP 欄位已填滿驗證碼位數（「確認」是否可按） */
  otpFilled: boolean
  /** 清空 OTP 欄位（例：驗證碼錯誤時讓使用者重新輸入） */
  clearOtp: () => void
  /** 給 AppForm 的 onValuesChange：已發送後改了 targetFields，回到尚未發送並清空 OTP */
  handleValuesChange: (changed: object) => void
}

/**
 * 「填資料 → 發送 OTP → 在同一張表單輸入驗證碼」的共用狀態（註冊第一步、忘記密碼、奉獻收據）。
 * 包一層 useOtpSender，並處理表單上的 OTP 欄位（name 固定為 otp）。驗證 API 與錯誤彈窗仍由各頁處理。
 *
 *   const otp = useOtpForm(form, sendReceiptOtp, { targetFields: ['email', 'phone'], onResendError })
 *   <AppForm form={form} onValuesChange={otp.handleValuesChange} onFinish={(v) => (otp.sent ? verify(v) : otp.send(body))}>
 */
export function useOtpForm<TBody>(
  form: FormInstance,
  sendFn: (body: TBody) => Promise<OtpSendResponse>,
  { targetFields, ...options }: UseOtpFormOptions,
): OtpForm<TBody> {
  const otp = useOtpSender(sendFn, options)
  const code = (Form.useWatch('otp', form) as string | undefined) ?? ''

  const clearOtp = () => form.setFieldValue('otp', '')

  const send = async (body: TBody) => {
    const res = await otp.send(body)
    clearOtp()
    return res
  }

  const handleValuesChange = (changed: object) => {
    if (!otp.sent || !Object.keys(changed).some((name) => targetFields.includes(name))) return
    otp.reset()
    clearOtp()
  }

  return { ...otp, send, otpFilled: code.length === otp.length, clearOtp, handleValuesChange }
}
