import { useNavigate } from 'react-router'
import { PasswordChangedResult } from '../../components/ForgotPasswordCard'
import { PATHS } from '../../routes/paths'

/** 忘記密碼：變更完成（PATHS.forgotPasswordDone），「返回」回登入頁。畫面見 PasswordChangedResult（與 SSO 登入頁共用） */
export default function ForgotPasswordDone() {
  const navigate = useNavigate()

  return <PasswordChangedResult onBack={() => navigate(PATHS.login, { replace: true })} />
}
