import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import ResultPage from '../../components/ResultPage'
import { PATHS } from '../../routes/paths'
import { getRegisterFlow } from './registerFlow'
import styles from './RegisterLineSuccess.module.css'

/** 顯示「Line創建成功」後自動跳轉的等待時間（設計未定，暫定） */
const REDIRECT_DELAY_MS = 2000

/**
 * 註冊：Line 審核成功（docs/design/register/README.md「line審核成功」）。
 * Line 授權導回（LineCallback）回 REGISTER_REQUIRED 時，lineToken 已寫入 registerFlow，導到這頁；
 * 顯示「Line創建成功／自動跳轉中請稍後」，數秒後自動接回一般創建流程。
 *
 * 已確認（#12） L6：第一次用 Line 登入的人從註冊第一步開始（出生／信箱／手機＋OTP，PATHS.register），
 * 之後的個資聲明、會員資料輸入照一般流程，送出時一併帶 lineToken。
 */
export default function RegisterLineSuccess() {
  const navigate = useNavigate()
  const [hasLineToken] = useState(() => !!getRegisterFlow().lineToken)

  useEffect(() => {
    if (!hasLineToken) return
    const timer = window.setTimeout(() => navigate(PATHS.register, { replace: true }), REDIRECT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [hasLineToken, navigate])

  if (!hasLineToken) return <Navigate to={PATHS.register} replace />

  return (
    <ResultPage
      fullPage
      title="Line創建成功"
      description={<span role="status">自動跳轉中請稍後</span>}
      className={styles.result}
    />
  )
}
