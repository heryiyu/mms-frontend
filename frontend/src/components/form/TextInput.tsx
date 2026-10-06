import { Input } from 'antd'
import type { InputProps, InputRef } from 'antd'
import type { Ref } from 'react'
import { cx } from './cx'
import styles from './formControls.module.css'

export interface TextInputProps extends InputProps {
  ref?: Ref<InputRef>
}

// 單行輸入框（docs/design/components Input）
// 狀態：default／focus（1px 主色框）／filled／error（框線維持灰、文字變紅）／disabled
// 放在 Form.Item 內時 status 由驗證結果自動帶入；單獨使用可傳 status="error"
export default function TextInput({ className, ...props }: TextInputProps) {
  return <Input className={cx(styles.input, className)} {...props} />
}
