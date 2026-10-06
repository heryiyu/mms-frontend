import type { ReactNode } from 'react'
import styles from './GuestLayout.module.css'

/**
 * 全寬表單（full 變體）的底部固定操作列：白底、上方分隔線，按鈕置中並排。
 * 手機兩顆按鈕各佔一半寬，桌機固定寬（docs/design/register/README.md「會員資料輸入」）。
 */
export default function GuestActionBar({ children }: { children: ReactNode }) {
  return <div className={styles.actionBar}>{children}</div>
}
