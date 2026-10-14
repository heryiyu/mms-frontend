import { useNavigate } from 'react-router'
import { logout } from '../api/auth'
import { PATHS } from '../routes/paths'
import { authStore } from './store'

/**
 * 還不能使用會員中心的頁面（等待審核、註冊完成、會員資料填寫、申請被退回）按「返回」時：
 * 有登入狀態就先登出再回登入頁。Logto 模式必須結束 SSO session（會轉址），
 * 否則回登入頁時 SSO 直接放行，又回到同一頁。
 */
export function useLeaveToLogin() {
  const navigate = useNavigate()

  return async () => {
    try {
      if (authStore.getSession()) await logout()
    } catch {
      // logout() 失敗時也已清掉本機登入狀態
    } finally {
      navigate(PATHS.login, { replace: true })
    }
  }
}
