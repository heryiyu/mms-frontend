import { useCallback, useEffect, useState } from 'react'
import { isApiError } from '../api/client'
import { getMe } from '../api/member'
import type { Me } from '../api/types'
import { useAuth } from './useAuth'

export type MeLoadState = 'loading' | 'ready' | 'error'

type Loaded = { key: string; me: Me | null; failed: boolean }

/**
 * 取得目前登入會員的資料（首頁橫幅暱稱、個人資訊檢視／修改共用）。
 * 每次掛載都重新 GET /me，修改完成回檢視頁、回首頁時都會拿到最新資料；登入身分（session.id）改變時也會重抓。
 * 401 由 client 統一清除登入狀態、路由守衛導回登入頁，這裡維持 loading 不顯示錯誤。
 */
export function useMe() {
  const sessionId = useAuth().session?.id
  const [reloadCount, setReloadCount] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  // 結果以 key 記錄對應的登入身分與重新載入次數，切換身分或重新載入時舊結果自動失效（不必在 effect 內同步 setState）
  const key = `${sessionId ?? ''}#${reloadCount}`

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    getMe()
      .then((me) => !cancelled && setLoaded({ key, me, failed: false }))
      .catch((error: unknown) => {
        if (cancelled || isApiError(error, 'UNAUTHORIZED')) return
        setLoaded({ key, me: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, key])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])

  const current = loaded?.key === key ? loaded : null
  const loadState: MeLoadState = !current ? 'loading' : current.failed ? 'error' : 'ready'
  return { me: current?.me ?? null, loadState, reload }
}
