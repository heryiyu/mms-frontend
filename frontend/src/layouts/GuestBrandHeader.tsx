import { Flex, Typography } from 'antd'
import styles from './GuestLayout.module.css'

/**
 * 未登入卡片頂部的品牌區：Logo + 「新生命會員中心」+ 英文副標（docs/design/layout/README.md 2.1）。
 * 只有登入頁有；註冊、忘記密碼的卡片沒有 Logo，所以由頁面自行放置。
 */
export default function GuestBrandHeader() {
  return (
    <Flex vertical align="center" gap="small" className={styles.brand}>
      {/* TODO(#12)：正式 Logo 圖檔未提供，暫以主色方塊＋手寫字體文字代替 */}
      <div className={styles.logo} role="img" aria-label="NewLife">
        NewLife
      </div>
      <div>
        <h1 className={styles.brandTitle}>新生命會員中心</h1>
        {/* TODO(#12)：副標照稿「Menber」，疑為 Member 誤植，待設計確認 */}
        <Typography.Text className={styles.brandSubtitle}>Newlife Menber Hub</Typography.Text>
      </div>
    </Flex>
  )
}
