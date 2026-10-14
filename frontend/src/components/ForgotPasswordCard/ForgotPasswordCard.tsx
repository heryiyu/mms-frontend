import type { ReactNode } from 'react'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import styles from './ForgotPasswordCard.module.css'

export interface ForgotPasswordCardProps {
  /** 卡片標題，預設「忘記密碼」 */
  title?: ReactNode
  children?: ReactNode
}

/**
 * 忘記密碼卡片版面：置中標題＋各步驟表單（docs/design/forgot-password/README.md）。放在 GuestLayout 的 card 變體內。
 * 會員中心忘記密碼（pages/forgot-password）、SSO 登入頁忘記密碼（sso/pages/ResetPassword.tsx）共用（#47 D12），
 * 會員中心進度查詢（pages/progress）沿用同一版面。
 *
 *   <ForgotPasswordCard>
 *     <AppForm className={ForgotPasswordCard.formClassName}>
 *       <Form.Item name="email" className={ForgotPasswordCard.fieldClassName}>…</Form.Item>
 *       {otp.sent && <OtpFormItem otp={otp} className={ForgotPasswordCard.fieldClassName} />}
 *       <Button htmlType="submit" block className={ForgotPasswordCard.submitClassName}>確認</Button>
 *     </AppForm>
 *   </ForgotPasswordCard>
 */
function ForgotPasswordCard({ title = '忘記密碼', children }: ForgotPasswordCardProps) {
  return (
    <div className={styles.page}>
      <h1 className={cx(typography.headline5, styles.title)}>{title}</h1>
      {children}
    </div>
  )
}

/** 卡片內的表單（AppForm 的 className） */
ForgotPasswordCard.formClassName = styles.form
/** 表單欄位（Form.Item 的 className）：欄位間距 12px */
ForgotPasswordCard.fieldClassName = styles.field
/** 「確認」按鈕：與最後一個欄位距離 20px */
ForgotPasswordCard.submitClassName = styles.submit

export default ForgotPasswordCard
