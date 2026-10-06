// 奉獻收據：驗證後寄到信箱（不在網頁直接下載）
import { post } from './client'
import type { OtpSendResponse, ReceiptOtpRequest, ReceiptSendRequest } from './types'

/**
 * 發送 OTP（重新發送也是呼叫這支）。
 * 可能的 ApiError.code：EMAIL_PHONE_MISMATCH、TOO_MANY_ATTEMPTS、VALIDATION_ERROR
 */
export function sendReceiptOtp(body: ReceiptOtpRequest): Promise<OtpSendResponse> {
  return post<OtpSendResponse>('/receipts/otp', body)
}

/** 驗證 OTP 並寄出收據。錯誤碼：OTP_INVALID、OTP_EXPIRED、EMAIL_PHONE_MISMATCH、NO_RECORDS */
export function sendReceipt(body: ReceiptSendRequest): Promise<void> {
  return post<void>('/receipts/send', body)
}
