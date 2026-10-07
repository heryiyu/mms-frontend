import { useNavigate } from 'react-router'
import ResultPage from '../../components/ResultPage'
import { PATHS } from '../../routes/paths'

/**
 * 忘記密碼：變更完成（docs/design/forgot-password/README.md「waiting」，檔名叫 waiting 但內容是完成）。
 * 整頁 bgLayout、內容置中、沒有卡片：主色勾勾＋「變更完成！」＋主色「返回」（回登入頁）。
 */
export default function ForgotPasswordDone() {
  const navigate = useNavigate()

  return <ResultPage fullPage title="變更完成！" onBack={() => navigate(PATHS.login, { replace: true })} />
}
