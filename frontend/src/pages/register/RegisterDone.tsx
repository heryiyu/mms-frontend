import { useNavigate } from 'react-router'
import ResultPage from '../../components/ResultPage'
import { CHURCH_CONTACT_EMAIL, CHURCH_CONTACT_MAILTO } from '../../constants/contact'
import { PATHS } from '../../routes/paths'
import styles from './RegisterResult.module.css'

/**
 * 註冊：等待核准中（docs/design/register/README.md「等待核准中」）。
 * 整頁 bgLayout、內容置中：主色勾勾＋「目前資料已經完成／等待審核中」＋「有任何問題請聯繫XXXX」＋主色「返回」（回登入頁）。
 *
 * 審核沒通過時由後端以 Email 或手機簡訊通知（設計註記「發Mail或手機通知沒有申請成功」），這裡補一行說明。
 * TODO(#12)：該行說明設計稿未畫，文案與是否保留待確認；聯繫方式 XXXX 見 constants/contact.ts。
 */
export default function RegisterDone() {
  const navigate = useNavigate()

  return (
    <main className={styles.page}>
      <ResultPage
        title={
          <>
            目前資料已經完成
            <br />
            等待審核中
          </>
        }
        description={
          <>
            有任何問題請聯繫
            <a href={CHURCH_CONTACT_MAILTO} className={styles.contact}>
              {CHURCH_CONTACT_EMAIL}
            </a>
            <br />
            審核結果將以電子信箱或手機簡訊通知
          </>
        }
        onBack={() => navigate(PATHS.login, { replace: true })}
        className={styles.result}
      />
    </main>
  )
}
