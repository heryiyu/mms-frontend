// 目前登入會員：基本資料與個人資訊修改（需 OTP）
import { get, post } from './client'
import type { Me, OtpSendResponse, ProfileChangeRequest, ProfileChangeVerifyRequest } from './types'

/** 取得目前會員資料（身分證字號為遮罩值） */
export function getMe(): Promise<Me> {
  return get<Me>('/me')
}

/**
 * 送出要修改的資料並發送 OTP（重新發送也是呼叫這支）。
 * 可能的 ApiError.code：ALREADY_REGISTERED（信箱／手機已被使用）、TOO_MANY_ATTEMPTS、VALIDATION_ERROR
 */
export function sendProfileChangeOtp(body: ProfileChangeRequest): Promise<OtpSendResponse> {
  return post<OtpSendResponse>('/me/profile-change/otp', body)
}

/** 驗證 OTP 並正式更新資料，回傳更新後的會員資料。錯誤碼：OTP_INVALID、OTP_EXPIRED */
export function verifyProfileChange(body: ProfileChangeVerifyRequest): Promise<Me> {
  return post<Me>('/me/profile-change/verify', body)
}
