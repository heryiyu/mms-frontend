// 註冊流程（OTP → 個資聲明 → 會員資料送出）、Logto 模式的會員資料申請（#48）與審核進度查詢
import { get, post } from './client'
import type {
  ContactOtpRequest,
  ContactVerifyRequest,
  OtpSendResponse,
  PrivacyStatement,
  ProgressOtpRequest,
  ProgressQueryRequest,
  ProgressQueryResponse,
  RegisterOtpRequest,
  RegisterOtpVerifyRequest,
  RegisterOtpVerifyResponse,
  RegisterRequest,
  RegisterResponse,
  RegistrationInfo,
  RegistrationRequest,
  RegistrationResponse,
  SsoAccount,
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

/* ---------- Logto 模式：第一次登入填寫會員資料（#48） ---------- */
// 帳號、密碼在 SSO 註冊；這裡只收會員資料。後端以 Logto access token 識別是誰，不需要 registerToken。

/** 取得 SSO 帳號的名字與聯絡方式、申請狀態；被退回時附退回原因與上次填的內容 */
export function getRegistration(): Promise<RegistrationInfo> {
  return get<RegistrationInfo>('/me/registration')
}

/**
 * 補填另一個聯絡方式：發送驗證碼（email、phone 擇一；重新發送也是呼叫這支）。
 * 可能的 ApiError.code：ALREADY_REGISTERED（已被其他 SSO 帳號使用）、TOO_MANY_ATTEMPTS、VALIDATION_ERROR
 */
export function sendRegistrationContactOtp(body: ContactOtpRequest): Promise<OtpSendResponse> {
  return post<OtpSendResponse>('/me/registration/contact/otp', body)
}

/** 驗證補填的聯絡方式，通過後後端寫回 SSO，回傳更新後的帳號資料。錯誤碼：OTP_INVALID、OTP_EXPIRED、ALREADY_REGISTERED */
export function verifyRegistrationContact(body: ContactVerifyRequest): Promise<SsoAccount> {
  return post<SsoAccount>('/me/registration/contact/verify', body)
}

/**
 * 送出會員資料，成功後帳號為待審核；被退回的人重新送出也是這支。
 * 錯誤碼：ALREADY_REGISTERED（身分證字號已被使用）、ALREADY_PROCESSED（已送出過）、VALIDATION_ERROR
 */
export function submitRegistration(body: RegistrationRequest): Promise<RegistrationResponse> {
  return post<RegistrationResponse>('/me/registration', body)
}

/**
 * 審核進度查詢第一步：發驗證碼到 email 或手機（重新發送也呼叫這支）。
 * 查無申請紀錄也回成功、不透露帳號是否存在。錯誤碼：VALIDATION_ERROR、TOO_MANY_ATTEMPTS
 */
export function sendProgressOtp(body: ProgressOtpRequest): Promise<OtpSendResponse> {
  return post<OtpSendResponse>('/register/progress/otp', body)
}

/** 審核進度查詢第二步：驗證通過回傳進度。查無申請紀錄一律當驗證碼錯誤（OTP_INVALID）；另有 OTP_EXPIRED */
export function queryProgress(body: ProgressQueryRequest): Promise<ProgressQueryResponse> {
  return post<ProgressQueryResponse>('/register/progress', body)
}
