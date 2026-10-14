// 註冊流程跨步驟的暫存狀態，存在 sessionStorage：重新整理不會遺失，關掉分頁即清除；送出成功後呼叫 clearRegisterFlow()。
// 兩種流程各存一份，互不干擾：
// - register（本機模式）：Line 授權 → 出生／信箱／手機＋OTP → 個資聲明 → 會員資料（含密碼）→ 送出
// - apply（Logto 模式，#48）：出生／補填聯絡方式 → 個資聲明 → 會員資料（不含密碼）→ 送出
// 只放「之後步驟要帶回」的資料，不存密碼、身分證字號。
import type { RegisterRequest, RegistrationDraft } from '../../api/types'

export type RegisterFlowKind = 'register' | 'apply'

const STORAGE_KEYS: Record<RegisterFlowKind, string> = {
  register: 'nlc.registerFlow',
  apply: 'nlc.applyFlow',
}

export type RegisterFlowState = Partial<
  Pick<
    RegisterRequest,
    'registerToken' | 'lineToken' | 'birthDate' | 'email' | 'phone' | 'guardianName' | 'agreedToPrivacy'
  >
> & {
  /** 同意的個資保護聲明版本（RegisterPrivacy 寫入）。TODO(#12)：後端是否需要此欄位待確認 */
  privacyVersion?: string
  /**
   * apply 流程：會員資料頁的預設值（第一步寫入）。
   * 名字先帶入 SSO 的名字；被退回重新送出時帶入上次填的內容。
   */
  prefill?: Partial<Omit<RegistrationDraft, 'birthDate' | 'guardianName'>>
}

function read(kind: RegisterFlowKind): RegisterFlowState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS[kind])
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as RegisterFlowState) : {}
  } catch {
    return {}
  }
}

export function getRegisterFlow(kind: RegisterFlowKind = 'register'): RegisterFlowState {
  return read(kind)
}

/** 合併寫入（各步驟只寫自己負責的欄位） */
export function updateRegisterFlow(patch: RegisterFlowState, kind: RegisterFlowKind = 'register') {
  try {
    sessionStorage.setItem(STORAGE_KEYS[kind], JSON.stringify({ ...read(kind), ...patch }))
  } catch {
    // 無痕模式等環境可能無法寫入；之後步驟會因缺資料導回起點
  }
}

export function clearRegisterFlow(kind: RegisterFlowKind = 'register') {
  try {
    sessionStorage.removeItem(STORAGE_KEYS[kind])
  } catch {
    // 同上
  }
}
