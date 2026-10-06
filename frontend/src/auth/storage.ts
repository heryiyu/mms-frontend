// 登入狀態的持久化抽象。token 存放方式待後端決定（localStorage／sessionStorage／HttpOnly Cookie…），
// authStore 只透過 AuthStorage 介面讀寫，要換實作時寫一個新的 AuthStorage 再呼叫 authStore.setStorage() 即可。
import type { AccountStatus, Role } from '../api/types'
import { isRole } from './roles'

/** 目前登入者；null = 未登入 */
export interface AuthSession {
  token: string
  role: Role
  status: AccountStatus
}

export interface AuthStorage {
  /** 讀取已保存的登入狀態；沒有或格式不符回 null */
  load(): AuthSession | null
  /**
   * 保存登入狀態。
   * remember = true 表示要跨瀏覽器關閉保留（「記住帳號」）；未傳 = 沿用目前的保存位置（例如只更新角色）。
   */
  save(session: AuthSession, remember?: boolean): void
  clear(): void
}

const STORAGE_KEY = 'nlc_mms_auth'

const ACCOUNT_STATUSES: AccountStatus[] = ['ACTIVE', 'PENDING']

function parse(raw: string | null): AuthSession | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<AuthSession>
    if (typeof value.token !== 'string' || !value.token) return null
    if (!isRole(value.role)) return null
    if (!value.status || !ACCOUNT_STATUSES.includes(value.status)) return null
    return { token: value.token, role: value.role, status: value.status }
  } catch {
    return null
  }
}

// 所有 storage 存取都包 try/catch（無痕模式、封鎖 Cookie 時可能丟例外），讀取失敗一律視為未登入
function read(storage: () => Storage): string | null {
  try {
    return storage().getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function write(storage: () => Storage, value: string) {
  try {
    storage().setItem(STORAGE_KEY, value)
  } catch {
    // storage 不可用時無法保存，使用者重新整理頁面後需要重新登入
  }
}

function remove(storage: () => Storage) {
  try {
    storage().removeItem(STORAGE_KEY)
  } catch {
    // 忽略
  }
}

const local = () => window.localStorage
const session = () => window.sessionStorage

/** 預設實作：勾選「記住帳號」存 localStorage（關閉瀏覽器仍保留），否則存 sessionStorage */
export const webAuthStorage: AuthStorage = {
  load() {
    return parse(read(session)) ?? parse(read(local))
  },
  save(value, remember) {
    const useLocal = remember ?? (read(session) === null && read(local) !== null)
    // 先清掉另一邊，避免兩邊各存一份、登出時殘留
    remove(useLocal ? session : local)
    write(useLocal ? local : session, JSON.stringify(value))
  },
  clear() {
    remove(session)
    remove(local)
  },
}

/** 只存在記憶體（重新整理即登出）；測試或後端改用 HttpOnly Cookie 時可參考 */
export function createMemoryAuthStorage(): AuthStorage {
  let current: AuthSession | null = null
  return {
    load: () => current,
    save: (value) => {
      current = value
    },
    clear: () => {
      current = null
    },
  }
}
