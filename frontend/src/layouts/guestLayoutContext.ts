import { createContext, useContext, useLayoutEffect } from 'react'

// 未登入版型的變體：
// - card：右側 420px 卡片（登入、註冊前段、忘記密碼）；手機為全寬卡片
// - full：全寬表單（註冊「會員資料輸入」），不使用卡片，底部可放 <ActionBar fixed />（components/ActionBar）
// - none：不套版型，頁面自己畫整頁（例：SSO 忘記密碼最後的 <ResultPage fullPage>，同一路由內從卡片切過來）
// 切換變體不會重新掛載頁面（GuestLayout 各變體的元素結構相同），同一路由內切換步驟用一般的 state 即可
export type GuestLayoutVariant = 'card' | 'full' | 'none'

export interface GuestLayoutOptions {
  variant: GuestLayoutVariant
}

export const defaultGuestLayoutOptions: GuestLayoutOptions = { variant: 'card' }

export const GuestLayoutContext = createContext<(options: GuestLayoutOptions) => void>(() => {})

/**
 * 頁面用來切換版型變體。註冊流程在同一路由內會從卡片切到全寬表單，
 * 所以由頁面依步驟呼叫，而不是寫死在路由上。卸載時還原成預設（card）。
 * 用 layout effect：在畫面繪製前就換好外框，不會先閃一下預設的卡片。
 */
export function useGuestLayout(variant: GuestLayoutVariant = 'card') {
  const setOptions = useContext(GuestLayoutContext)
  useLayoutEffect(() => {
    setOptions({ variant })
    return () => setOptions(defaultGuestLayoutOptions)
  }, [setOptions, variant])
}
