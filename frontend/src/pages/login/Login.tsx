import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getLineAuthUrl, login } from '../../api/auth'
import { ApiError, isApiError } from '../../api/client'
import type { ErrorCode } from '../../api/types'
import { Button } from '../../components/Button'
import { emailRules } from '../../components/form'
import Icon from '../../components/Icon'
import { type LoginAccountField, type LoginValues, LoginView, useLoginSubmit } from '../../components/LoginView'
import { useNotifyModal } from '../../components/NoticeModal'
import { PATHS } from '../../routes/paths'
import { brandColors } from '../../theme/tokens'
import { getLoginErrorNotice, TOO_MANY_ATTEMPTS_NOTICE } from './loginErrors'

// 登入頁（issue #14，docs/design/login/README.md）。畫面在共用的 LoginView（與 SSO 登入頁共用，#47 D12）。
// 狀態：default（空白）→ ing（輸入中，兩欄皆有值才可按「登入」）→ loading（Logo 遮罩）
//   → 成功：login() 寫入 auth store，GuestOnly 守衛自動導回原頁／首頁
//   → ACCOUNT_PENDING：導向等待審核頁
//   → 其他失敗：通知彈窗，關閉後回到輸入中（保留已輸入內容）
//
// 已確認（#12）：
// - 「記住帳號」沿用 authStore 的 remember（勾選＝關閉瀏覽器仍保持登入）
// - L2 密碼錯 3 次暫停 5 分鐘、暫停累計 3 次鎖帳號（由後端計數，回 TOO_MANY_ATTEMPTS／ACCOUNT_LOCKED）；
//   前端收到 TOO_MANY_ATTEMPTS 後同樣暫停送出 LOGIN_COOLDOWN_MS（useLoginSubmit）

const ACCOUNT_FIELD: LoginAccountField = {
  rules: emailRules(),
  placeholder: '請輸入電子信箱',
  label: '電子信箱',
  type: 'email',
}

const LINKS = { progress: PATHS.progress, forgotPassword: PATHS.forgotPassword, register: PATHS.register }

/** Line 登入失敗時，LineCallback 導回登入頁用 location.state 帶錯誤碼，由這裡顯示彈窗 */
export interface LoginPageState {
  lineError?: { status: number; code: ErrorCode; message: string }
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { submitting, begin, end } = useLoginSubmit()
  const [lineLoading, setLineLoading] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  // Line 登入失敗導回時顯示對應彈窗，並清掉 state 避免重新整理後再跳一次
  const lineError = (location.state as LoginPageState | null)?.lineError
  useEffect(() => {
    if (!lineError) return
    void notify(getLoginErrorNotice(new ApiError(lineError.status, lineError.code, lineError.message)))
    navigate(location.pathname, { replace: true, state: null })
  }, [lineError, location.pathname, navigate, notify])

  const handleFinish = async ({ account, password, remember = false }: LoginValues) => {
    const status = begin()
    if (status === 'busy') return
    if (status === 'cooldown') {
      void notify(TOO_MANY_ATTEMPTS_NOTICE)
      return
    }
    try {
      await login({ email: account.trim(), password }, remember)
      // 成功：GuestOnly 守衛會自動導頁，元件即將卸載，不需再更新狀態
    } catch (error) {
      end({ cooldown: isApiError(error, 'TOO_MANY_ATTEMPTS') })
      if (isApiError(error, 'ACCOUNT_PENDING')) {
        navigate(PATHS.pending)
        return
      }
      void notify(getLoginErrorNotice(error))
    }
  }

  const handleLineLogin = async () => {
    if (lineLoading) return
    setLineLoading(true)
    try {
      const { url } = await getLineAuthUrl('login')
      window.location.assign(url)
    } catch (error) {
      setLineLoading(false)
      void notify(getLoginErrorNotice(error))
    }
  }

  return (
    <>
      {contextHolder}
      <LoginView
        account={ACCOUNT_FIELD}
        submitting={submitting}
        onFinish={handleFinish}
        links={LINKS}
        social={
          <Button
            variant="secondary"
            block
            icon={<Icon name="line" color={brandColors.line} />}
            loading={lineLoading}
            onClick={handleLineLogin}
          >
            使用Line快速登入
          </Button>
        }
      />
    </>
  )
}
