// OTP 驗證碼的共用設定（註冊、忘記密碼、個資修改、奉獻收據共用；issue #5）
// TODO(#12)：設計未定案（docs/design/questions.md「OTP 驗證」）——
// - 寄送對象（手機簡訊或信箱；修改信箱／手機時寄舊的還是新的）
// - 驗證碼長度：收據稿上 4 碼、個資修改稿上 5 個 X
// - 有效時間：稿上「有效時間4：50」，推測總長 5 分鐘
// 實際值以「發送 OTP」API 回傳的 length／expiresIn 為準，這裡只是 API 沒給時的預設值。

/** 驗證碼預設位數 */
export const OTP_DEFAULT_LENGTH = 4

/** 驗證碼預設有效秒數 */
export const OTP_DEFAULT_EXPIRES_IN = 300

/** 把 API 回傳的有效秒數換算成到期時間（epoch ms），給 OtpField 的 expiresAt 使用 */
export const toOtpExpiresAt = (expiresIn: number = OTP_DEFAULT_EXPIRES_IN, now = Date.now()) => now + expiresIn * 1000
