import { Card } from 'antd'
import { useState } from 'react'
import { Outlet } from 'react-router'
import styles from './GuestLayout.module.css'
import {
  defaultGuestLayoutOptions,
  GuestLayoutContext,
  type GuestLayoutOptions,
  type GuestLayoutVariant,
} from './guestLayoutContext'

/** 各變體的外框 class；不需要的那層用 passThrough（display: contents）讓它不產生方框 */
const FRAME_CLASSES: Record<GuestLayoutVariant, { page: string; card: string; body: string }> = {
  card: { page: styles.page, card: styles.card, body: styles.cardBody },
  full: { page: styles.full, card: styles.passThrough, body: styles.passThrough },
  none: { page: styles.passThrough, card: styles.passThrough, body: styles.passThrough },
}

/**
 * 未登入版型（登入／註冊／忘記密碼共用），規格見 docs/design/layout/README.md 2.1、3.2。
 * - 手機（< md）：卡片高 fill，寬 = 裝置寬 − 左右 20px
 * - 桌機（≥ md）：卡片固定 420px 靠右，四周 40px，高 fill，左側空白 fill
 * - full 變體：全寬表單（註冊「會員資料輸入」），左右 20px／lg 起 120px
 * - none 變體：不包外框，頁面自己畫整頁（例：SSO 忘記密碼的「變更完成！」）
 * 斷點依 docs 第 6 節建議用 md 切換卡片寬度；平板無設計稿，已確認（#12）：沿用此斷點。
 *
 * 三種變體都輸出同一組元素、只換 class：外框的元素結構一變，React 會把 Outlet 底下的頁面整個重新掛載
 * （表單內容、步驟等狀態遺失，畫面閃一下）。none 變體的頁面自己有 <main>（ResultPage fullPage），外層不加 main 角色。
 */
export default function GuestLayout() {
  const [options, setOptions] = useState<GuestLayoutOptions>(defaultGuestLayoutOptions)
  const frame = FRAME_CLASSES[options.variant]

  return (
    <GuestLayoutContext.Provider value={setOptions}>
      <div role={options.variant === 'none' ? undefined : 'main'} className={frame.page}>
        <Card variant="borderless" className={frame.card} classNames={{ body: frame.body }}>
          <Outlet />
        </Card>
      </div>
    </GuestLayoutContext.Provider>
  )
}
