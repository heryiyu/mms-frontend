// 目前登入會員：基本資料與個人資訊修改（需 OTP）
import { get, post } from './client'
import type { Me, ProfileChangeOtpResponse, ProfileChangeRequest, ProfileChangeVerifyRequest } from './types'

/** 取得目前會員資料（身分證字號為遮罩值） */
export function getMe(): Promise<Me> {
  return get<Me>('/me')
}

/**
 * 送出要修改的資料並發送 OTP（重新發送也是呼叫這支），回應帶驗證碼寄到哪裡（sentTo）。
 * 可能的 ApiError.code：CONTACT_IN_USE（信箱／手機已被其他 SSO 帳號使用）、TOO_MANY_ATTEMPTS、VALIDATION_ERROR
 */
export function sendProfileChangeOtp(body: ProfileChangeRequest): Promise<ProfileChangeOtpResponse> {
  return post<ProfileChangeOtpResponse>('/me/profile-change/otp', body)
}

/** 驗證 OTP 並正式更新資料（後端寫回 SSO），回傳更新後的會員資料。錯誤碼：OTP_INVALID、OTP_EXPIRED、CONTACT_IN_USE */
export function verifyProfileChange(body: ProfileChangeVerifyRequest): Promise<Me> {
  return post<Me>('/me/profile-change/verify', body)
}
