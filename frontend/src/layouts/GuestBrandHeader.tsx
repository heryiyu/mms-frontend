import { Flex, Typography } from 'antd'
import { BRAND_LOGO_SRC } from '../constants/brand'
import typography from '../styles/typography.module.css'
import { cx } from '../utils/cx'
import styles from './GuestLayout.module.css'

/**
 * 品牌 Logo（圖檔本身含圓角底色）。預設 80×80，
 * 尺寸可由 className 覆寫 CSS 變數 --brand-logo-size，例：登入 Loading 遮罩。
 */
export function BrandLogo({ className }: { className?: string }) {
  return <img src={BRAND_LOGO_SRC} alt="NewLife" className={cx(styles.logo, className)} />
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
        <h1 className={cx(typography.headline5, styles.brandTitle)}>新生命會員中心</h1>
        {/* 設計稿拼為「Menber」，判定為誤植，改為 Member */}
        <Typography.Text className={styles.brandSubtitle}>Newlife Member Hub</Typography.Text>
      </div>
    </Flex>
  )
}
