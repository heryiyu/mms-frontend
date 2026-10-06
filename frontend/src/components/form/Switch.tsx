import { Switch as AntSwitch } from 'antd'
import type { SwitchProps } from 'antd'
import type { CSSProperties } from 'react'
import { useState } from 'react'
import { formControlSize } from '../../theme/components/formControls'
import Icon from '../Icon'
import { cx } from './cx'
import styles from './formControls.module.css'

// 把手位置給 CSS 用（尺寸來源：src/theme/components/formControls.ts）
const switchVars = {
  '--switch-handle': `${formControlSize.switchHandleSize}px`,
  '--switch-padding': `${formControlSize.switchTrackPadding}px`,
} as CSSProperties

// 開關（docs/design/components Switch BTN）：約 42 × 24
// on：主色軌道、白色把手內含主色勾；off：白底 gray3 框、gray3 把手內含白色減號
// AntD 無法在把手內放圖示，因此以絕對定位把 Icon 疊在把手上（不攔截點擊）
export default function Switch({ className, checked, defaultChecked, onChange, disabled, ...props }: SwitchProps) {
  const isControlled = checked !== undefined
  const [innerChecked, setInnerChecked] = useState(!!defaultChecked)
  const on = isControlled ? !!checked : innerChecked

  return (
    <span
      className={cx(styles.switch, on && styles.switchOn, disabled && styles.switchDisabled, className)}
      style={switchVars}
    >
      <AntSwitch
        checked={on}
        disabled={disabled}
        onChange={(value, event) => {
          if (!isControlled) setInnerChecked(value)
          onChange?.(value, event)
        }}
        {...props}
      />
      <span className={styles.switchIcon} aria-hidden>
        <Icon name={on ? 'check-lg' : 'dash-lg'} />
      </span>
    </span>
  )
}
