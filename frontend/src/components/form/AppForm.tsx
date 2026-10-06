import { Form, Grid } from 'antd'
import type { FormItemProps, FormProps } from 'antd'
import type { PropsWithChildren, ReactNode } from 'react'
import { formControlSize } from '../../theme/components/formControls'
import { cx } from './cx'
import styles from './formControls.module.css'

// 必填星號放在標籤「後」、顏色 colorError（AntD 預設在前）
const renderRequiredMark = (label: ReactNode, { required }: { required: boolean }) => (
  <>
    {label}
    {required && (
      <span className={styles.requiredMark} aria-hidden>
        *
      </span>
    )}
  </>
)

// 套好設計稿樣式的 Form：
// - 必填星號在標籤後、不顯示冒號
// - 內含的 Input 在驗證失敗時框線維持灰色，只有文字與提示文字變紅
// - 驗證訊息為 Body1、colorError
export default function AppForm<Values = unknown>({ className, ...props }: PropsWithChildren<FormProps<Values>>) {
  return (
    <Form<Values>
      className={cx(styles.form, className)}
      colon={false}
      requiredMark={renderRequiredMark}
      {...props}
    />
  )
}

// 帶標題的輸入列（docs/design/components title Input）：左標籤（gray2）＋右輸入框
// mobile-first：xs 時標籤在上方，sm 起改為左右排列、標籤欄寬約 100px（目測）
export function TitleFormItem(props: FormItemProps) {
  const screens = Grid.useBreakpoint()
  const horizontal = !!screens.sm
  return (
    <Form.Item
      layout={horizontal ? 'horizontal' : 'vertical'}
      labelAlign="left"
      labelCol={horizontal ? { flex: `0 0 ${formControlSize.labelWidth}px` } : undefined}
      wrapperCol={horizontal ? { flex: 1 } : undefined}
      {...props}
    />
  )
}
