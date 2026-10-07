// 註冊流程跨步驟的暫存狀態（Line 授權 → 出生／信箱／手機＋OTP → 個資聲明 → 會員資料 → 送出）。
// 存在 sessionStorage：重新整理不會遺失，關掉分頁即清除；送出成功後呼叫 clearRegisterFlow()。
// 只放「之後步驟送出註冊時要帶回」的資料，不存密碼、身分證字號等會員資料。
import type { RegisterRequest } from '../../api/types'

const STORAGE_KEY = 'nlc.registerFlow'

export type RegisterFlowState = Partial<
  Pick<
    RegisterRequest,
    'registerToken' | 'lineToken' | 'birthDate' | 'email' | 'phone' | 'guardianName' | 'agreedToPrivacy'
  >
> & {
  /** 同意的個資保護聲明版本（RegisterPrivacy 寫入）。TODO(#12)：後端是否需要此欄位待確認 */
  privacyVersion?: string
}

function read(): RegisterFlowState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as RegisterFlowState) : {}
  } catch {
    return {}
  }
}

export function getRegisterFlow(): RegisterFlowState {
  return read()
}

/** 合併寫入（各步驟只寫自己負責的欄位） */
export function updateRegisterFlow(patch: RegisterFlowState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...read(), ...patch }))
  } catch {
    // 無痕模式等環境可能無法寫入；之後步驟會因缺資料導回起點
  }
}

export function clearRegisterFlow() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 同上
  }
}
