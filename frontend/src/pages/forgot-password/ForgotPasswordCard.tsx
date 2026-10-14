import type { ReactNode } from 'react'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import styles from './ForgotPassword.module.css'

/**
 * 忘記密碼卡片內容的外框：標題「忘記密碼」＋各步驟表單（docs/design/forgot-password/README.md）。
 * 放在 GuestLayout 卡片內（useGuestLayout('card')）。
 * 會員中心（ForgotPassword.tsx）與 SSO 登入頁（src/sso/pages/ResetPassword.tsx）共用（#47 D12）。
 */
export default function ForgotPasswordCard({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <h1 className={cx(typography.headline5, styles.title)}>忘記密碼</h1>
      {children}
    </div>
  )
}
