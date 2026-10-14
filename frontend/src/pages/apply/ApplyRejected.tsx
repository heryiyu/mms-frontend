import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { isApiError } from '../../api/client'
import { getRegistration } from '../../api/register'
import { authStore } from '../../auth/store'
import { useLeaveToLogin } from '../../auth/useLeaveToLogin'
import { Button } from '../../components/Button'
import ContactEmailLink from '../../components/ContactEmailLink'
import PageLoading from '../../components/PageLoading'
import ResultPage from '../../components/ResultPage'
import { PATHS, STATUS_PATHS } from '../../routes/paths'
import { clearRegisterFlow } from '../register/registerFlow'
import styles from './ApplyRejected.module.css'

/**
 * 申請被退回（Logto 模式，#48；架構整理 D10：可修改後重新送出、退回時附原因）。
 * 設計稿未畫，沿用等待審核頁的整頁結果版面（ResultPage fullPage）＋警告圖示：
 * 標題「申請未通過審核」、退回原因、聯絡信箱；「修改資料」回到填寫流程（帶入上次填的內容），「返回」登出。
 */

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; reason?: string }

export default function ApplyRejected() {
  const navigate = useNavigate()
  const leaveToLogin = useLeaveToLogin()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getRegistration()
      .then((info) => {
        if (cancelled) return
        if (info.status !== 'REJECTED') {
          // 狀態已改變（例如另一個分頁已重新送出）：同步登入狀態並導到對應頁面
          authStore.updateSession({ status: info.status })
          navigate(info.status === 'ACTIVE' ? PATHS.home : STATUS_PATHS[info.status], { replace: true })
          return
        }
        setLoad({ status: 'ready', reason: info.rejectReason })
      })
      .catch((error: unknown) => {
        // 401 由 client 統一導回登入頁
        if (!cancelled && !isApiError(error, 'UNAUTHORIZED')) setLoad({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [navigate, reloadKey])

  if (load.status === 'loading') return <PageLoading />

  if (load.status === 'error') {
    return (
      <ResultPage
        fullPage
        status="error"
        title="資料載入失敗"
        description="請確認網路連線後重新載入"
        backText="重新載入"
        onBack={() => {
          setLoad({ status: 'loading' })
          setReloadKey((key) => key + 1)
        }}
      />
    )
  }

  const handleEdit = () => {
    // 重新從第一步開始，第一步會帶入上次填的內容
    clearRegisterFlow('apply')
    navigate(PATHS.apply)
  }

  return (
    <ResultPage
      fullPage
      status="warning"
      title="申請未通過審核"
      description={
        <>
          {load.reason && (
            <span className={styles.reason}>
              退回原因：{load.reason}
              <br />
            </span>
          )}
          請修改資料後重新送出，有任何問題請聯繫
          <ContactEmailLink />
        </>
      }
      extra={
        <div className={styles.actions}>
          <Button onClick={handleEdit}>修改資料</Button>
          <Button variant="text" onClick={() => void leaveToLogin()}>
            返回
          </Button>
        </div>
      }
    />
  )
}
