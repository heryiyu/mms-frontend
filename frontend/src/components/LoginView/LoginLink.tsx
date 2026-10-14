import type { ReactNode } from 'react'
import { Link } from 'react-router'
import styles from './LoginView.module.css'

const ABSOLUTE_URL = /^https?:\/\//

/**
 * 登入頁的主色文字連結。to 是站內路徑時用 react-router 的 Link；
 * 是完整網址時（例：SSO 登入頁連到會員中心的進度查詢）用一般 <a>。
 */
export default function LoginLink({ to, children }: { to: string; children: ReactNode }) {
  if (ABSOLUTE_URL.test(to)) {
    return (
      <a href={to} className={styles.link}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} className={styles.link}>
      {children}
    </Link>
  )
}
