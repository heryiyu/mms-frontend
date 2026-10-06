import { useSyncExternalStore } from 'react'
import type { Role } from '../api/types'
import { hasMinRole } from './roles'
import { authStore } from './store'

/**
 * 在元件中讀取登入狀態，store 改變（登入、登出、401）時自動重新渲染。
 * - isActive：已登入且帳號已核准，才可進入會員中心
 * - can(minRole)：目前角色是否達到 minRole 以上，選單與首頁卡片用它決定是否顯示
 */
export function useAuth() {
  const session = useSyncExternalStore(authStore.subscribe, authStore.getSession)
  const role = session?.role ?? null
  return {
    session,
    role,
    isAuthenticated: session !== null,
    isActive: session?.status === 'ACTIVE',
    isPending: session?.status === 'PENDING',
    can: (minRole?: Role) => hasMinRole(role, minRole),
  }
}
