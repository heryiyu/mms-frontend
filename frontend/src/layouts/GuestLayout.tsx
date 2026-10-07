import { Card } from 'antd'
import { useState } from 'react'
import { Outlet } from 'react-router'
import styles from './GuestLayout.module.css'
import { defaultGuestLayoutOptions, GuestLayoutContext, type GuestLayoutOptions } from './guestLayoutContext'

/**
 * 未登入版型（登入／註冊／忘記密碼共用），規格見 docs/design/layout/README.md 2.1、3.2。
 * - 手機（< md）：卡片高 fill，寬 = 裝置寬 − 左右 20px
 * - 桌機（≥ md）：卡片固定 420px 靠右，四周 40px，高 fill，左側空白 fill
 * - full 變體：全寬表單（註冊「會員資料輸入」），左右 20px／lg 起 120px
 * 斷點依 docs 第 6 節建議用 md 切換卡片寬度；平板無設計稿，已確認（#12）：沿用此斷點。
 */
export default function GuestLayout() {
  const [options, setOptions] = useState<GuestLayoutOptions>(defaultGuestLayoutOptions)

  return (
    <GuestLayoutContext.Provider value={setOptions}>
      {options.variant === 'full' ? (
        <main className={styles.full}>
          <Outlet />
        </main>
      ) : (
        <main className={styles.page}>
          <Card variant="borderless" className={styles.card} classNames={{ body: styles.cardBody }}>
            <Outlet />
          </Card>
        </main>
      )}
    </GuestLayoutContext.Provider>
  )
}
