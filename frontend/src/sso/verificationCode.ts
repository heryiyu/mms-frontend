// Logto 驗證碼（email／簡訊）和會員中心 components/OtpInput 之間的轉接（註冊、忘記密碼共用）。
// OtpInput 的 useOtpForm 需要發送 API 回傳 { length, expiresIn }，Experience API 只回 verificationId，所以用固定值。
import type { OtpSendResponse } from '../api/types'

/**
 * 驗證碼位數與有效時間：Experience API 不回傳，Logto 後台 verificationCodePolicy 目前空白，用 Logto 預設值
 * （6 碼、10 分鐘）。後台改設定時要一起改。
 * TODO(#47)：未實測（正式 SSO 不能寄驗證碼），收到實際驗證信／簡訊時確認位數與有效時間。
 */
export const LOGTO_CODE: OtpSendResponse = { length: 6, expiresIn: 600 }

/** 驗證碼錯誤：清空讓使用者重新輸入 */
export const CODE_MISMATCH_ERRORS = ['verification_code.code_mismatch']

/** 這組驗證碼已不能用（逾時、錯太多次、驗證紀錄不見）：回到「尚未發送」，按「確認」重新發送 */
export const CODE_INVALIDATED_ERRORS = [
  'verification_code.expired',
  'verification_code.exceed_max_try',
  'verification_code.not_found',
  'session.verification_session_not_found',
]
