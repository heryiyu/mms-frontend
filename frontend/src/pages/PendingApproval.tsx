import { useLeaveToLogin } from '../auth/useLeaveToLogin'
import ContactEmailLink from '../components/ContactEmailLink'
import ResultPage from '../components/ResultPage'

/**
 * 等待審核頁（docs/design/login/README.md「等待審核」，web/mob 等待審核.png）。
 * 無卡片、無圖示，整頁 bgLayout，內容置中：標題「等待審核中」＋「有任何問題請聯繫XXXX」＋主色「返回」。
 * 登入回 ACCOUNT_PENDING、或登入狀態為 PENDING 時由路由守衛導來；未登入也可直接開啟。
 * 待審核帳號不能使用會員中心，「返回」登入頁時一併登出。
 */
export default function PendingApproval() {
  const leaveToLogin = useLeaveToLogin()

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
      onBack={() => void leaveToLogin()}
    />
  )
}
