import ResultPage from '../ResultPage'

/**
 * 忘記密碼：變更完成（docs/design/forgot-password/README.md「waiting」，檔名叫 waiting 但內容是完成）。
 * 整頁 bgLayout、內容置中、沒有卡片：主色勾勾＋「變更完成！」＋主色「返回」。
 * 會員中心（pages/forgot-password/ForgotPasswordDone.tsx）與 SSO 登入頁（sso/pages/ResetPassword.tsx）共用（#47 D12），
 * 「返回」導向哪裡由呼叫端決定（兩邊都是回登入頁）。
 */
export default function PasswordChangedResult({ onBack }: { onBack: () => void }) {
  return <ResultPage fullPage title="變更完成！" onBack={onBack} />
}
