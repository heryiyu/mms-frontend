// 登入狀態（auth store）：全站唯一的登入者資訊來源。
// - 不依賴 React／router，api/client.ts 可以直接讀 token、401 時清除。
// - React 端用 useAuth()（src/auth/useAuth.ts）訂閱；路由守衛見 src/auth/guards.tsx。
// - 持久化透過 AuthStorage 介面（src/auth/storage.ts），實作可替換。
import type { AccountStatus, Role } from '../api/types'
import { type AuthSession, type AuthStorage, webAuthStorage } from './storage'

export type { AuthSession, AuthStorage } from './storage'

type Listener = () => void

let storage: AuthStorage = webAuthStorage
let current: AuthSession | null = storage.load()
const listeners = new Set<Listener>()

function emit(next: AuthSession | null) {
  current = next
  listeners.forEach((listener) => listener())
}

export const authStore = {
  /** 目前登入狀態；未登入為 null。回傳值在狀態改變前維持同一個參考（可給 useSyncExternalStore 用） */
  getSession(): AuthSession | null {
    return current
  },

  getToken(): string | null {
    return current?.token ?? null
  },

  /** 登入成功時呼叫。remember = true 時跨瀏覽器關閉保留（「記住帳號」） */
  setSession(session: AuthSession, remember = false) {
    storage.save(session, remember)
    emit({ ...session })
  },

  /** 更新角色／帳號狀態（例如重新取得 /me 後同步角色），沿用原本的保存位置；未登入時不做事 */
  updateSession(patch: Partial<{ role: Role; status: AccountStatus }>) {
    if (!current) return
    const next = { ...current, ...patch }
    storage.save(next)
    emit(next)
  },

  /** 登出、401 時呼叫 */
  clear() {
    storage.clear()
    if (current) emit(null)
  },

  /** 訂閱狀態變化，回傳取消訂閱函式 */
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  /** 替換持久化實作（例如後端改用 HttpOnly Cookie），會從新的 storage 重新載入狀態 */
  setStorage(next: AuthStorage) {
    storage = next
    emit(storage.load())
  },
}
