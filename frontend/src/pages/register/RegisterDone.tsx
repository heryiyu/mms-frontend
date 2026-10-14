import { useLeaveToLogin } from '../../auth/useLeaveToLogin'
import ContactEmailLink from '../../components/ContactEmailLink'
import ResultPage from '../../components/ResultPage'

/**
 * 註冊：等待核准中（docs/design/register/README.md「等待核准中」）。
 * 整頁 bgLayout、內容置中：主色勾勾＋「目前資料已經完成／等待審核中」＋「有任何問題請聯繫XXXX」＋主色「返回」（回登入頁）。
 *
 * 審核沒通過時由後端以 Email 或手機簡訊通知（設計註記「發Mail或手機通知沒有申請成功」），這裡補一行說明。
 * TODO(#12)：該行說明設計稿未畫，文案與是否保留待確認；聯繫方式 XXXX 見 constants/contact.ts。
 *
 * Logto 模式第一次登入填完會員資料（#48）也到這頁；這時已登入 SSO，「返回」會一併登出。
 */
export default function RegisterDone() {
  const leaveToLogin = useLeaveToLogin()

  return (
    <ResultPage
      fullPage
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
          <ContactEmailLink />
          <br />
          審核結果將以電子信箱或手機簡訊通知
        </>
      }
      onBack={() => void leaveToLogin()}
    />
  )
}
