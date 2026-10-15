// Experience API 錯誤碼 → 畫面上的中文提示，依主題分組。
// 已實測確認的錯誤碼標「實測」；其餘未實測，依 Logto 原始碼與 API 規格整理（正式 SSO 不能寄驗證碼、建帳號、改密碼，
// 本機也走不完 Line／Google 授權），遇到時請實測後更新註記。
// 頁面若要依錯誤碼做不同處理（例如 session.not_found 轉回原網站），用 isExperienceError 判斷，不要比對訊息文字。
import { isExperienceError } from './client'

const MESSAGES: Record<string, string> = {
  // ---- 前端自訂 ----
  network_error: '網路連線異常，請稍後再試', // client.ts：連不到伺服器
  social_session_invalid: '社群登入已失效，請重新登入', // social.ts：導回時 state 對不上或沒有轉址前存的紀錄
  social_cancelled: '已取消社群登入', // social.ts：使用者在 Line／Google 取消授權

  // ---- interaction、驗證紀錄 ----
  'session.not_found': '登入逾時，請回到原網站重新登入', // 實測：沒有 interaction cookie
  'session.verification_session_not_found': '驗證已失效，請重新操作',
  'session.verification_failed': '驗證失敗，請重新操作',
  'session.identifier_not_found': '驗證已失效，請重新操作', // 還沒 identify 就設定密碼（PUT /profile/password 的 404）
  'guard.invalid_input': '資料格式不正確，請檢查後再試',

  // ---- 登入 ----
  'session.invalid_credentials': '帳號或密碼錯誤', // 實測：帳號不存在也是這個碼
  'session.verification_blocked_too_many_attempts': '嘗試過於頻繁，請稍後再試', // 實測：錯 3 次暫停 5 分鐘，第 3 次就回這個碼（400）（#47、#46）
  'user.suspended': '帳號已停用，請聯繫管理員',
  'password.expired': '密碼已過期，請使用忘記密碼重新設定',

  // ---- 帳號（註冊、忘記密碼） ----
  'user.email_already_in_use': '此電子信箱已註冊',
  'user.phone_already_in_use': '此手機號碼已註冊',
  'user.user_not_exist': '查無此帳號',

  // ---- 密碼（註冊、忘記密碼）；password.rejected 的細節見下方 PASSWORD_REJECTED_MESSAGES ----
  'password.rejected': '密碼不符合規則',
  'user.password_policy_violation': '密碼不符合規則', // 規格寫的碼；實際可能回 password.rejected
  'user.same_password': '新密碼不能和目前的密碼相同',

  // ---- 驗證碼（註冊、忘記密碼） ----
  'verification_code.code_mismatch': '驗證碼錯誤',
  'verification_code.expired': '驗證碼已過期，請重新發送',
  'verification_code.exceed_max_try': '驗證碼錯誤次數過多，請重新發送',
  'verification_code.not_found': '驗證碼已失效，請重新發送', // 沒有發送紀錄或已用過
  'verification_code.phone_mismatch': '手機號碼和收到驗證碼的不同，請重新發送',
  'verification_code.email_mismatch': '電子信箱和收到驗證碼的不同，請重新發送',

  // ---- connector（社群登入；寄驗證碼的 email／簡訊服務也是 connector） ----
  'connector.not_found': '服務暫時無法使用，請稍後再試或改用其他方式', // 社群 connector 或 email／簡訊服務沒設定
  'connector.not_enabled': '社群登入暫時無法使用，請改用其他方式登入',
  'connector.general': '社群登入失敗，請稍後再試',
  'connector.invalid_response': '社群登入失敗，請稍後再試',
  'connector.authorization_failed': '社群帳號授權失敗，請重新操作',
  'connector.invalid_auth_code': '社群帳號授權已失效，請重新操作',

  // ---- 社群登入 ----
  'session.connector_session_not_found': '社群登入逾時，請重新操作',
  'user.identity_not_exist': '此社群帳號尚未註冊',
  'user.identity_already_in_use': '此社群帳號已綁定其他帳號',
  'user.missing_profile': '需要補填帳號資料才能繼續', // 註冊缺密碼、姓名，或社群帳號缺 email／手機
}

// 密碼不符 Logto 密碼規則（password.rejected 的 data.result[].code）。
// Logto 後台密碼規則目前是預設值（passwordPolicy 空白：至少 8 碼、不可為外洩過的常見密碼、不可有連續／重複字元、不可含個人資料），
// 前端先擋「至少 8 碼且含英文與數字」（constants/password.ts），其餘只有送出後才知道。
const PASSWORD_REJECTED_MESSAGES: Record<string, string> = {
  'password_rejected.too_short': '密碼長度不足',
  'password_rejected.too_long': '密碼太長',
  'password_rejected.character_types': '密碼需包含更多種類的字元（英文大小寫、數字、符號）',
  'password_rejected.unsupported_characters': '密碼含有不支援的字元',
  'password_rejected.pwned': '這個密碼太常見或曾外洩，請換一個',
  'password_rejected.restricted_found': '密碼不能含有容易被猜到的字詞',
  'password_rejected.restricted.repetition': '密碼不能有重複的字元（例如 aaa）',
  'password_rejected.restricted.sequence': '密碼不能有連續的字元（例如 123、abc）',
  'password_rejected.restricted.user_info': '密碼不能含有姓名、電子信箱或手機號碼',
  'password_rejected.restricted.words': '密碼不能含有容易被猜到的字詞',
}

/** password.rejected 的細節（第一條不符合的規則）；不是這個錯誤或沒有對照時回 null */
function getPasswordRejectedMessage(error: unknown): string | null {
  if (!isExperienceError(error, 'password.rejected')) return null
  const result = (error.data as { result?: unknown } | undefined)?.result
  if (!Array.isArray(result)) return null
  for (const item of result as { code?: unknown }[]) {
    const message = typeof item?.code === 'string' ? PASSWORD_REJECTED_MESSAGES[item.code] : undefined
    if (message) return message
  }
  return null
}

/** 錯誤提示文字；沒有對照的錯誤碼回 fallback（不直接顯示 Logto 的英文訊息） */
export function getExperienceErrorMessage(error: unknown, fallback = '發生錯誤，請稍後再試'): string {
  if (!isExperienceError(error)) return fallback
  return getPasswordRejectedMessage(error) ?? MESSAGES[error.code] ?? fallback
}
