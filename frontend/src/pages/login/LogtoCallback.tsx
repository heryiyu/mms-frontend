import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { completeLogtoSignIn, logout } from '../../api/auth'
import { isApiError } from '../../api/client'
import { consumePostLoginFrom } from '../../auth/logto'
import ContactEmailLink from '../../components/ContactEmailLink'
import ResultPage from '../../components/ResultPage'
import { getPostLoginPath, PATHS } from '../../routes/paths'
import LoginLoading from './LoginLoading'

/**
 * Logto 登入完成後的導回頁（Logto 模式，#44）。只顯示 loading 遮罩，完成後：
 * - ACTIVE：回到登入前被擋下的原頁（沒有則首頁）
 * - PENDING：等待審核頁
 * - 失敗：錯誤結果頁（設計稿未畫，沿用結果頁的失敗樣式），「重新登入」會先結束 Logto session，
 *   否則 Logto 直接放行、又回到同樣的錯誤
 */

function getFailure(error: unknown): { title: string; description: ReactNode } {
  const contact = (
    <>
      請聯繫
      <ContactEmailLink />
    </>
  )
  if (isApiError(error, 'ACCOUNT_REJECTED')) return { title: '申請未通過審核', description: contact }
  if (isApiError(error, 'ACCOUNT_LOCKED')) return { title: '帳號已鎖定', description: contact }
  // TODO(#43)：會員資料填寫流程完成後，改導向填寫頁
  if (isApiError(error, 'MEMBER_NOT_FOUND')) {
    return {
      title: '尚未建立會員資料',
      description: <>此帳號尚未完成會員註冊，{contact}</>,
    }
  }
  if (isApiError(error, 'NETWORK_ERROR')) return { title: '登入失敗', description: error.message }
  // Logto 換 token 失敗（使用者取消授權、callback 網址重複使用等）或後端其他錯誤
  return { title: '登入失敗', description: '請重新登入，若持續發生請稍後再試' }
}

export default function LogtoCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<unknown>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  // StrictMode 會執行兩次 effect；code 只能換一次，避免重複呼叫
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    completeLogtoSignIn(window.location.href)
      .then(({ status }) => {
        const from = consumePostLoginFrom()
        navigate(status === 'ACTIVE' ? getPostLoginPath({ from }) : PATHS.pending, { replace: true })
      })
      .catch((cause: unknown) => setError(cause ?? new Error('登入失敗')))
  }, [navigate])

  if (!error) return <LoginLoading spinning />

  const handleRelogin = () => {
    if (loggingOut) return
    setLoggingOut(true)
    // 成功時會轉址離開；失敗時本機登入狀態已清掉，直接回登入頁
    logout().catch(() => navigate(PATHS.login, { replace: true }))
  }

  const { title, description } = getFailure(error)
  return (
    <ResultPage
      fullPage
      status="error"
      title={title}
      description={description}
      backText="重新登入"
      onBack={handleRelogin}
    />
  )
}
