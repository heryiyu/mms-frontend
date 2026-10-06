// 忘記密碼（OTP → 重設）與已登入的修改密碼
import { post, put } from './client'
import type {
  ChangePasswordRequest,
  ForgotPasswordOtpRequest,
  ForgotPasswordVerifyRequest,
  ForgotPasswordVerifyResponse,
  OtpSendResponse,
  ResetPasswordRequest,
} from './types'

/**
 * 發送重設密碼 OTP（重新發送也是呼叫這支）。
 * 可能的 ApiError.code：ACCOUNT_NOT_FOUND、EMAIL_PHONE_MISMATCH、TOO_MANY_ATTEMPTS
 */
export function sendForgotPasswordOtp(body: ForgotPasswordOtpRequest): Promise<OtpSendResponse> {
  return post<OtpSendResponse>('/password/forgot/otp', body)
}

/** 驗證 OTP，成功回傳一次性 resetToken。錯誤碼：OTP_INVALID、OTP_EXPIRED */
export function verifyForgotPasswordOtp(body: ForgotPasswordVerifyRequest): Promise<ForgotPasswordVerifyResponse> {
  return post<ForgotPasswordVerifyResponse>('/password/forgot/verify', body)
}

/** 以 resetToken 設定新密碼。錯誤碼：TOKEN_INVALID、VALIDATION_ERROR */
export function resetPassword(body: ResetPasswordRequest): Promise<void> {
  return post<void>('/password/forgot/reset', body)
}

/** 已登入會員修改密碼。錯誤碼：WRONG_CURRENT_PASSWORD、PASSWORD_SAME_AS_OLD、VALIDATION_ERROR */
export function changePassword(body: ChangePasswordRequest): Promise<void> {
  return put<void>('/me/password', body)
}
