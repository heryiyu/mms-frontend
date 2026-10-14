import { Divider } from 'antd'
import type { ReactNode } from 'react'
import { Link, type To } from 'react-router'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import styles from './RegisterCard.module.css'

export interface RegisterCardProps {
  /** 卡片標題，預設「創建帳號」 */
  title?: ReactNode
  /** 卡片底部（通常是 RegisterBackLink） */
  footer?: ReactNode
  children?: ReactNode
}

/**
 * 「創建帳號」卡片版面：置中標題、表單、卡片底部「返回」（docs/design/register「Default」「ing」「otp」）。
 * 會員中心註冊第一步（pages/register/Register.tsx）與 SSO 登入頁註冊（sso/pages/Register.tsx）共用（#47 D12），
 * 改設計時只改這裡。放在 GuestLayout 的 card 變體內使用。
 *
 *   <RegisterCard footer={<RegisterBackLink to={PATHS.login} />}>
 *     <AppForm className={RegisterCard.formClassName}>…
 *       <Button htmlType="submit" block className={RegisterCard.submitClassName}>確認</Button>
 *     </AppForm>
 *   </RegisterCard>
 */
function RegisterCard({ title = '創建帳號', footer, children }: RegisterCardProps) {
  return (
    <div className={styles.page}>
      <h1 className={cx(typography.headline5, styles.title)}>{title}</h1>
      {children}
      {footer && <p className={styles.footer}>{footer}</p>}
    </div>
  )
}

/** 卡片內的表單（AppForm 的 className）：欄位間距 12px */
RegisterCard.formClassName = styles.form
/** 表單內的「確認」按鈕：與最後一個欄位距離 20px */
RegisterCard.submitClassName = styles.submit

export default RegisterCard

/** 「確認」與社群按鈕之間的「or」分隔線 */
export function RegisterDivider() {
  return (
    <Divider plain className={styles.divider}>
      or
    </Divider>
  )
}

export type RegisterBackLinkProps = { children?: ReactNode } & (
  | { to: To; onClick?: never; disabled?: never }
  | { to?: never; onClick: () => void; disabled?: boolean }
)

/** 卡片底部「返回」（黑字底線）：給 to 時是站內連結，給 onClick 時是按鈕（例如回到同一頁的上一步） */
export function RegisterBackLink({ children = '返回', ...props }: RegisterBackLinkProps) {
  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={styles.back}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" className={styles.back} onClick={props.onClick} disabled={props.disabled}>
      {children}
    </button>
  )
}
