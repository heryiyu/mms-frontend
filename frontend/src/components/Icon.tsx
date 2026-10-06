import type { CSSProperties } from 'react'
import { cx } from '../utils/cx'

// Bootstrap Icons 包裝元件，name 對照 https://icons.getbootstrap.com/ 的圖示名稱（不含 bi- 前綴）
interface IconProps {
  name: string
  size?: number | string
  color?: string
  className?: string
  style?: CSSProperties
  label?: string
}

export default function Icon({ name, size, color, className, style, label }: IconProps) {
  return (
    <i
      className={cx('bi', `bi-${name}`, className)}
      style={{ fontSize: size, color, lineHeight: 1, ...style }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
