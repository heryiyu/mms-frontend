import { useCallback, useRef, useState } from 'react'

/** 收到「登入過度頻繁」後，前端暫停送出的時間（與伺服器暫停 5 分鐘一致，#12 L2、#47） */
export const LOGIN_COOLDOWN_MS = 5 * 60_000

/**
 * 登入送出的前端阻擋（設計師註記「前端要做阻擋」）：
 * - 送出中再按（state 更新前連點／連按 Enter）不會重複送出
 * - 呼叫 end({ cooldown: true }) 後 LOGIN_COOLDOWN_MS 內 begin() 回 'cooldown'，由呼叫端顯示「過度頻繁」提示
 *
 *   const { submitting, begin, end } = useLoginSubmit()
 *   const status = begin()   // 'ok' 才繼續；成功導頁時不必呼叫 end()，維持 loading 遮罩
 */
export function useLoginSubmit() {
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const cooldownUntilRef = useRef(0)

  const begin = useCallback((): 'ok' | 'busy' | 'cooldown' => {
    if (submittingRef.current) return 'busy'
    if (Date.now() < cooldownUntilRef.current) return 'cooldown'
    submittingRef.current = true
    setSubmitting(true)
    return 'ok'
  }, [])

  const end = useCallback(({ cooldown = false }: { cooldown?: boolean } = {}) => {
    submittingRef.current = false
    setSubmitting(false)
    if (cooldown) cooldownUntilRef.current = Date.now() + LOGIN_COOLDOWN_MS
  }, [])

  return { submitting, begin, end }
}
