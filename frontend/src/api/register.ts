// 註冊流程（OTP → 個資聲明 → 會員資料送出）與審核進度查詢
import { get, post } from './client'
import type {
  OtpSendResponse,
  PrivacyStatement,
  ProgressQueryRequest,
  ProgressQueryResponse,
  RegisterOtpRequest,
  RegisterOtpVerifyRequest,
  RegisterOtpVerifyResponse,
  RegisterRequest,
  RegisterResponse,
} from './types'

/**
 * 發送註冊用 OTP（重新發送也是呼叫這支）。
 * 可能的 ApiError.code：ALREADY_REGISTERED、TOO_MANY_ATTEMPTS、VALIDATION_ERROR
 */
export function sendRegisterOtp(body: RegisterOtpRequest): Promise<OtpSendResponse> {
  return post<OtpSendResponse>('/register/otp', body)
}

/** 驗證 OTP，成功回傳 registerToken，送出註冊時要帶回。錯誤碼：OTP_INVALID、OTP_EXPIRED */
export function verifyRegisterOtp(body: RegisterOtpVerifyRequest): Promise<RegisterOtpVerifyResponse> {
  return post<RegisterOtpVerifyResponse>('/register/otp/verify', body)
}

/** 個資保護聲明內容 */
export function getPrivacyStatement(): Promise<PrivacyStatement> {
  return get<PrivacyStatement>('/register/privacy-statement')
}

/** 送出註冊。錯誤碼：TOKEN_INVALID、ALREADY_REGISTERED、VALIDATION_ERROR */
export function submitRegister(body: RegisterRequest): Promise<RegisterResponse> {
  return post<RegisterResponse>('/register', body)
}

/** 審核進度查詢。查無資料回 ACCOUNT_NOT_FOUND */
export function queryProgress(body: ProgressQueryRequest): Promise<ProgressQueryResponse> {
  return post<ProgressQueryResponse>('/register/progress', body)
}
