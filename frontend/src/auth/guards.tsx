// 路由守衛（用法見 src/routes/index.tsx）：都是 layout route，通過時渲染 <Outlet />。
import { Navigate, Outlet, useLocation } from 'react-router'
import type { Role } from '../api/types'
import { getPostLoginPath, type LoginRedirectState, PATHS, STATUS_PATHS } from '../routes/paths'
import { useAuth } from './useAuth'

/** 會員中心：未登入 → 登入頁（記住原頁）；帳號尚未核准 → 依狀態導到等待審核頁或會員資料填寫流程 */
export function RequireAuth() {
  const { session } = useAuth()
  const location = useLocation()

  if (!session) {
    const state: LoginRedirectState = {
      from: { pathname: location.pathname, search: location.search, hash: location.hash },
    }
    return <Navigate to={PATHS.login} replace state={state} />
  }
  if (session.status !== 'ACTIVE') return <Navigate to={STATUS_PATHS[session.status]} replace />
  return <Outlet />
}

/**
 * 會員資料填寫流程（Logto 模式，#48）：已登入 SSO、還沒填會員資料或被退回才可進入。
 * 未登入 → 登入頁；已核准 → 首頁；待審核 → 等待審核頁。
 */
export function RequireApplicant() {
  const { session } = useAuth()
  if (!session) return <Navigate to={PATHS.login} replace />
  if (session.status === 'ACTIVE') return <Navigate to={PATHS.home} replace />
  if (session.status === 'PENDING') return <Navigate to={PATHS.pending} replace />
  return <Outlet />
}

/** 需要 minRole 以上的角色，權限不足 → 403 頁。須放在 RequireAuth 底下 */
export function RequireRole({ minRole }: { minRole: Role }) {
  const { can } = useAuth()
  if (!can(minRole)) return <Navigate to={PATHS.forbidden} replace />
  return <Outlet />
}

/** 未登入頁（登入、註冊、忘記密碼）：已登入且已核准 → 導回原頁或首頁 */
export function GuestOnly() {
  const { isActive } = useAuth()
  const location = useLocation()
  if (isActive) return <Navigate to={getPostLoginPath(location.state)} replace />
  return <Outlet />
}
