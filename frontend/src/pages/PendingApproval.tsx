import { useNavigate } from 'react-router'
import { authStore } from '../auth/store'
import ResultPage from '../components/ResultPage'
import { PATHS } from '../routes/paths'
import styles from './PendingApproval.module.css'

// TODO(#12)：「請聯繫XXXX」要換成教會 Email（mailto），信箱待提供
const CHURCH_CONTACT_EMAIL = 'XXXX'

/**
 * 等待審核頁（docs/design/login/README.md「等待審核」）。
 * 登入回 ACCOUNT_PENDING、或登入狀態為 PENDING 時由路由守衛導來；未登入也可直接開啟。
 * TODO(#12)：圖示沿用 ResultPage 預設（forgot-password README 記載與結果頁共用），待確認
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
        title="等待審核中"
        description={
          <>
            有任何問題請聯繫 <a href={`mailto:${CHURCH_CONTACT_EMAIL}`}>{CHURCH_CONTACT_EMAIL}</a>
          </>
        }
        onBack={handleBack}
      />
    </main>
  )
}
