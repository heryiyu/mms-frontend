// Experience API 錯誤碼 → 畫面上的中文提示。
// 已實測確認的錯誤碼標「實測」；其餘依 Logto 原始碼與 API 規格整理，做各頁時遇到請實測後更新。
// 頁面若要依錯誤碼做不同處理（例如 session.not_found 轉回原網站），用 isExperienceError 判斷，不要比對訊息文字。
import { isExperienceError } from './client'

const MESSAGES: Record<string, string> = {
  // 連線（client.ts 自訂）
  network_error: '網路連線異常，請稍後再試',

  // interaction
  'session.not_found': '登入逾時，請回到原網站重新登入', // 實測：沒有 interaction cookie
  'session.verification_session_not_found': '驗證已失效，請重新操作',
  'session.verification_failed': '驗證失敗，請重新操作',

  // 登入
  'session.invalid_credentials': '帳號或密碼錯誤', // 實測：帳號不存在也是這個碼
  'session.verification_blocked_too_many_attempts': '嘗試過於頻繁，請稍後再試', // 錯 3 次暫停 5 分鐘（#47、#46）
  'user.suspended': '帳號已停用，請聯繫管理員',
  'password.expired': '密碼已過期，請使用忘記密碼重新設定',

  // 註冊
  'user.email_already_in_use': '此電子信箱已註冊',
  'user.phone_already_in_use': '此手機號碼已註冊',
  'password.rejected': '密碼不符合規則',

  // 驗證碼
  'verification_code.code_mismatch': '驗證碼錯誤',
  'verification_code.expired': '驗證碼已過期，請重新發送',
  'verification_code.exceed_max_try': '驗證碼錯誤次數過多，請重新發送',

  // 忘記密碼
  'user.user_not_exist': '查無此帳號',
  'user.same_password': '新密碼不能和目前的密碼相同',

  // 社群登入
  'session.connector_session_not_found': '社群登入逾時，請重新操作',

  // #57 忘記密碼（依 Experience API 規格與 Logto 原始碼；正式 SSO 不能實測寄碼、改密碼，都還沒實測）
  'verification_code.not_found': '驗證碼已失效，請重新發送', // 沒有發送紀錄或已用過
  'session.identifier_not_found': '驗證已失效，請重新操作', // 還沒 identify 就設定密碼（PUT /profile/password 的 404）
  'user.password_policy_violation': '密碼不符合規則', // 規格寫的碼；實際可能回 password.rejected
  // #57 end
}

/** 錯誤提示文字；沒有對照的錯誤碼回 fallback（不直接顯示 Logto 的英文訊息） */
export function getExperienceErrorMessage(error: unknown, fallback = '發生錯誤，請稍後再試'): string {
  if (!isExperienceError(error)) return fallback
  return MESSAGES[error.code] ?? fallback
}
