import { Flex, Typography } from 'antd'
import { cx } from '../utils/cx'
import styles from './GuestLayout.module.css'

/**
 * 品牌 Logo：主色圓角方塊＋白色手寫字「NewLife」。預設 80×80，
 * 尺寸可由 className 覆寫 CSS 變數 --brand-logo-size（字級會跟著等比縮放），例：登入 Loading 遮罩。
 * TODO(#12)：正式 Logo 圖檔未提供，暫以主色方塊＋手寫字體文字代替
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cx(styles.logo, className)} role="img" aria-label="NewLife">
      NewLife
    </div>
  )
}

/**
 * 未登入卡片頂部的品牌區：Logo + 「新生命會員中心」+ 英文副標（docs/design/layout/README.md 2.1）。
 * 只有登入頁有；註冊、忘記密碼的卡片沒有 Logo，所以由頁面自行放置。
 */
export default function GuestBrandHeader() {
  return (
    // Logo 與標題間距約 16px（docs/design/login web/mob default.png 目測）
    <Flex vertical align="center" gap="middle" className={styles.brand}>
      <BrandLogo />
      <div>
        <h1 className={styles.brandTitle}>新生命會員中心</h1>
        {/* 設計稿拼為「Menber」，判定為誤植，改為 Member */}
        <Typography.Text className={styles.brandSubtitle}>Newlife Member Hub</Typography.Text>
      </div>
    </Flex>
  )
}
