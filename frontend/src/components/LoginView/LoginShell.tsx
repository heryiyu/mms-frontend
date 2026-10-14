import type { ReactNode } from 'react'
import GuestBrandHeader from '../../layouts/GuestBrandHeader'
import styles from './LoginView.module.css'

/**
 * 登入卡片的外框：品牌標頭（Logo＋標題）＋下方內容，放在 GuestLayout 卡片內。
 * LoginView 用它；會員中心 Logto 轉址頁（LogtoSignIn）的手動畫面也用它。
 */
export default function LoginShell({ children }: { children?: ReactNode }) {
  return (
    <div className={styles.page}>
      <GuestBrandHeader />
      {children}
    </div>
  )
}
