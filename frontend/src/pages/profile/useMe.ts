import { useCallback, useEffect, useState } from 'react'
import { isApiError } from '../../api/client'
import { getMe } from '../../api/member'
import type { Me } from '../../api/types'

export type MeLoadState = 'loading' | 'ready' | 'error'

/**
 * 取得目前會員資料（個人資訊檢視／修改共用）。每次進頁重新抓，修改完成回檢視頁、回首頁時都會拿到最新資料。
 * 401 由 client 統一清除登入狀態、路由守衛導回登入頁，這裡維持 loading 不顯示錯誤。
 */
export function useMe() {
  const [me, setMe] = useState<Me | null>(null)
  const [loadState, setLoadState] = useState<MeLoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getMe()
      .then((data) => {
        if (cancelled) return
        setMe(data)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled || isApiError(error, 'UNAUTHORIZED')) return
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const reload = useCallback(() => {
    setLoadState('loading')
    setReloadKey((key) => key + 1)
  }, [])

  return { me, loadState, reload }
}
