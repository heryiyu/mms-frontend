import { useNavigate } from 'react-router'
import { authStore } from '../auth/store'
import ResultPage from '../components/ResultPage'
import { CHURCH_CONTACT_EMAIL, CHURCH_CONTACT_MAILTO } from '../constants/contact'
import { PATHS } from '../routes/paths'
import styles from './PendingApproval.module.css'

/**
 * 等待審核頁（docs/design/login/README.md「等待審核」，web/mob 等待審核.png）。
 * 無卡片、無圖示，整頁 bgLayout，內容置中：標題「等待審核中」＋「有任何問題請聯繫XXXX」＋主色「返回」。
 * 登入回 ACCOUNT_PENDING、或登入狀態為 PENDING 時由路由守衛導來；未登入也可直接開啟。
 */
export default function PendingApproval() {
  const navigate = useNavigate()

  const handleBack = () => {
    // 待審核帳號不能使用會員中心，返回登入頁時一併清掉登入狀態
    authStore.clear()
    navigate(PATHS.login, { replace: true })
  }

  return (
    <main className={styles.page}>
      <ResultPage
        icon={null}
        title="等待審核中"
        description={
          <>
            有任何問題請聯繫
            <a href={CHURCH_CONTACT_MAILTO} className={styles.contact}>
              {CHURCH_CONTACT_EMAIL}
            </a>
          </>
        }
        onBack={handleBack}
        className={styles.result}
      />
    </main>
  )
}
