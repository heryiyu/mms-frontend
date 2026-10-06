import { useEffect, useState } from 'react'
import { IDLE_ACTIVITY_SYNC_MS, IDLE_LOGOUT_MS } from '../constants/idleLogout'
import {
  isLastActivityKey,
  parseLastActivity,
  readLastActivity,
  writeLastActivity,
} from './idleActivity'

/** 視為「有操作」的事件：滑鼠、鍵盤、觸控、捲動 */
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'wheel', 'scroll'] as const

// capture：scroll 不會冒泡，要在捕獲階段才收得到內層捲動容器的事件
const LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: true }

/**
 * 閒置偵測（#11）。超過 timeoutMs 沒有任何操作回傳 true，之後不再監聽，直到元件重新掛載。
 * - 最後操作時間跨分頁共用（src/auth/idleActivity.ts）：任一分頁有操作，其他分頁都會延後。
 * - 不是每次事件都重設計時器：只記錄時間，計時器到期時再檢查最新時間，未到就順延。
 * - 寫入 localStorage 有節流（IDLE_ACTIVITY_SYNC_MS），不會每次 mousemove 都寫。
 * - 背景分頁的計時器可能被瀏覽器延後，回到前景（visibilitychange）時會立即檢查。
 */
export function useIdleTimeout(timeoutMs: number = IDLE_LOGOUT_MS): boolean {
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (expired) return

    const stored = readLastActivity()
    // 沿用共用時間（重新整理後不重新計時）；沒有則從現在開始
    let last = stored ?? Date.now()
    let lastWritten = stored ?? 0
    if (stored === null) {
      writeLastActivity(last)
      lastWritten = last
    }
    let timer: number | undefined

    const isOver = (now: number) => now - last >= timeoutMs

    const stop = () => {
      window.clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, onActivity, LISTENER_OPTIONS))
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }

    const expire = () => {
      stop()
      setExpired(true)
    }

    const check = () => {
      const now = Date.now()
      if (isOver(now)) {
        expire()
        return
      }
      window.clearTimeout(timer)
      timer = window.setTimeout(check, last + timeoutMs - now)
    }

    function onActivity() {
      const now = Date.now()
      // 計時器被延後（休眠、背景分頁）時，先判斷是否早已逾時，不能讓這次操作把它救回來
      if (isOver(now)) {
        expire()
        return
      }
      last = now
      if (now - lastWritten >= IDLE_ACTIVITY_SYNC_MS) {
        lastWritten = now
        writeLastActivity(now)
      }
    }

    function onStorage(event: StorageEvent) {
      if (!isLastActivityKey(event.key)) return
      const at = parseLastActivity(event.newValue)
      if (at !== null && at > last) last = at
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') check()
    }

    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, onActivity, LISTENER_OPTIONS))
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibilityChange)
    check()

    return stop
  }, [expired, timeoutMs])

  return expired
}
