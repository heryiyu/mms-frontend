import { Form } from 'antd'
import type { FormItemProps } from 'antd'
import type { HTMLAttributes } from 'react'
import { cx } from '../../utils/cx'
import styles from './formCard.module.css'

// 卡片式表單（修改密碼、註冊會員資料）：
// <AppForm {...formCardLayout}>（formCardLayout.ts）內放 <FormCard>，每列用 <FormCardItem>。
// 手機也維持左右排列（與 TitleFormItem 的 xs 上下排列不同）。

export function FormCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(styles.card, className)} {...props} />
}

export function FormCardItem<Values = unknown>({ className, ...props }: FormItemProps<Values>) {
  return <Form.Item<Values> className={cx(styles.row, className)} {...props} />
}
