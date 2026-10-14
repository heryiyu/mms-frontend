import { useEffect } from 'react'

/**
 * 轉址離開後按上一頁、瀏覽器由 bfcache 原樣還原這頁時呼叫 onRestored（例如收起 loading 讓使用者能重新操作）。
 * 送出成功後轉址期間會維持 loading，不處理的話還原回來會一直轉。onRestored 要是穩定的函式（useCallback 或 setState）。
 */
export function usePageRestored(onRestored: () => void) {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) onRestored()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [onRestored])
}
