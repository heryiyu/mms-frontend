import { createContext, useContext, useEffect } from 'react'

// 未登入版型的變體：
// - card：右側 420px 卡片（登入、註冊前段、忘記密碼）；手機為全寬卡片
// - full：全寬表單（註冊「會員資料輸入」），不使用卡片，底部可放 <ActionBar fixed />（components/ActionBar）
// - none：不套版型，頁面自己畫整頁（例：SSO 忘記密碼最後的 <ResultPage fullPage>，同一路由內從卡片切過來）
// 注意：切換變體時頁面會重新掛載（外框結構不同），同一路由內切換的頁面要把「目前在哪一步」存在 location.state 等處
export type GuestLayoutVariant = 'card' | 'full' | 'none'

export interface GuestLayoutOptions {
  variant: GuestLayoutVariant
}

export const defaultGuestLayoutOptions: GuestLayoutOptions = { variant: 'card' }

export const GuestLayoutContext = createContext<(options: GuestLayoutOptions) => void>(() => {})

/**
 * 頁面用來切換版型變體。註冊流程在同一路由內會從卡片切到全寬表單，
 * 所以由頁面依步驟呼叫，而不是寫死在路由上。卸載時還原成預設（card）。
 */
export function useGuestLayout(variant: GuestLayoutVariant = 'card') {
  const setOptions = useContext(GuestLayoutContext)
  useEffect(() => {
    setOptions({ variant })
    return () => setOptions(defaultGuestLayoutOptions)
  }, [setOptions, variant])
}
