import { Input } from 'antd'
import type { InputRef } from 'antd'
import type { PasswordProps } from 'antd/es/input'
import type { Ref } from 'react'
import Icon from '../Icon'
import { cx } from '../../utils/cx'
import styles from './formControls.module.css'

export interface PasswordInputProps extends PasswordProps {
  ref?: Ref<InputRef>
}

// 密碼框（docs/design/components eye）：右側 Bootstrap Icons eye／eye-slash 切換顯示，圖示色 gray2
export default function PasswordInput({ className, ...props }: PasswordInputProps) {
  return (
    <Input.Password
      className={cx(styles.input, className)}
      iconRender={(visible) => (
        <Icon
          name={visible ? 'eye' : 'eye-slash'}
          className={styles.eye}
          label={visible ? '隱藏密碼' : '顯示密碼'}
        />
      )}
      {...props}
    />
  )
}
