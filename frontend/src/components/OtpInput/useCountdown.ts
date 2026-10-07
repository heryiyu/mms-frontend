import { useEffect, useState } from 'react'

// 每 250ms 重新計算一次：剩餘秒數由 Date.now() 推算，分頁切到背景、計時器被節流也不會累積誤差
const TICK_MS = 250

export interface Countdown {
  /** 剩餘秒數（無條件進位，最小 0）；expiresAt 為空時為 0 */
  remaining: number
  /** 已到期（expiresAt 為空時為 false，代表尚未開始倒數） */
  expired: boolean
}

/**
 * 倒數到指定時間點。expiresAt 為 epoch ms；傳 null／undefined 代表尚未開始（例如還沒發送 OTP）。
 * 換成新的 expiresAt（例如重新發送）會重新開始倒數。
 */
export function useCountdown(expiresAt?: number | null): Countdown {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (expiresAt == null) return
    const tick = () => {
      const current = Date.now()
      setNow(current)
      if (current >= expiresAt) window.clearInterval(id)
    }
    const id = window.setInterval(tick, TICK_MS)
    // 立即更新一次，避免沿用上一輪的 now（例如重新發送後短暫顯示錯誤的剩餘時間）
    const first = window.setTimeout(tick, 0)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(first)
    }
  }, [expiresAt])

  if (expiresAt == null) return { remaining: 0, expired: false }
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000))
  return { remaining, expired: remaining === 0 }
}

/** 秒數 → 「m：ss」（設計稿冒號為全形「：」，分鐘不補零，例如 4：50） */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}：${String(s % 60).padStart(2, '0')}`
}
