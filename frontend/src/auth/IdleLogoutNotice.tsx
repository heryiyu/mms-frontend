import { useState } from 'react'
import { logout } from '../api/auth'
import { NoticeModal } from '../components/NoticeModal'
import { useIdleTimeout } from './useIdleTimeout'

/**
 * 閒置自動登出（#11）：掛在登入後版型（MemberLayout），閒置超過時限顯示「通知」彈窗
 * （docs/design/member-home/web/會員系統/自動登出.png、docs/design/member-home/自動登出.png）。
 *
 * 彈窗蓋在原頁面上（照設計稿），按「確認」或 ✕／Esc／遮罩才真正登出：
 * logout() 清掉 auth store 後，RequireAuth 會導向登入頁並記住原頁，重新登入後回到原頁。
 * 若在彈窗出現前就清掉登入狀態，守衛會立刻導頁、版型卸載，彈窗就看不到了。
 * 彈窗期間遮罩擋住操作；重新整理或關閉後再開時，共用的最後操作時間已逾時，會立刻再跳出彈窗。
 *
 * TODO(#12)：後端是否也有閒置失效、逾時當下是否要先呼叫 /auth/logout 讓 token 失效，待後端確認。
 * 目前在使用者按確認時才呼叫；若後端先讓 token 失效，彈窗期間的請求收到 401 會直接導回登入頁（不顯示此彈窗）。
 */
export default function IdleLogoutNotice() {
  const expired = useIdleTimeout()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleClose = () => {
    if (loggingOut) return
    setLoggingOut(true)
    // logout() 不論 API 成功與否都會清掉本機登入狀態，這裡只需吞掉錯誤
    logout().catch(() => {})
  }

  return (
    <NoticeModal
      open={expired}
      title="通知"
      content="因長時間未操作，系統已自動登出。請重新登入後繼續使用。"
      confirmLoading={loggingOut}
      onOk={handleClose}
      onCancel={handleClose}
    />
  )
}
