import { useNavigate } from 'react-router'
import { logout } from '../api/auth'
import { authStore } from '../auth/store'
import ContactEmailLink from '../components/ContactEmailLink'
import ResultPage from '../components/ResultPage'
import { PATHS } from '../routes/paths'

/**
 * 等待審核頁（docs/design/login/README.md「等待審核」，web/mob 等待審核.png）。
 * 無卡片、無圖示，整頁 bgLayout，內容置中：標題「等待審核中」＋「有任何問題請聯繫XXXX」＋主色「返回」。
 * 登入回 ACCOUNT_PENDING、或登入狀態為 PENDING 時由路由守衛導來；未登入也可直接開啟。
 */
export default function PendingApproval() {
  const navigate = useNavigate()

  const handleBack = async () => {
    // 待審核帳號不能使用會員中心，返回登入頁時一併登出。
    // Logto 模式必須結束 Logto session（會轉址），否則回登入頁時 Logto 直接放行，又回到這一頁。
    try {
      if (authStore.getSession()) await logout()
    } catch {
      // logout() 失敗時也已清掉本機登入狀態
    } finally {
      navigate(PATHS.login, { replace: true })
    }
  }

  return (
    <ResultPage
      fullPage
      icon={null}
      title="等待審核中"
      description={
        <>
          有任何問題請聯繫
          <ContactEmailLink />
        </>
      }
      onBack={handleBack}
    />
  )
}
