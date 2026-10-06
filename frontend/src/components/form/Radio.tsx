import { Radio as AntRadio } from 'antd'
import type { RadioProps } from 'antd'
import { cx } from '../../utils/cx'
import styles from './formControls.module.css'

// 單選（docs/design/components Radio）：16px 圓形；checked 為主色外圈＋主色圓點、透明底，unchecked 為 gray3 外圈
// 大小／顏色由 src/theme/components/formControls.ts 的 Radio token 控制；這裡只修正 checked hover 不要填滿
export default function Radio({ className, ...props }: RadioProps) {
  return <AntRadio className={cx(styles.radio, className)} {...props} />
}

// 群組直接沿用 AntD（token 已全域套用）；個別選項請用上面的 Radio
Radio.Group = AntRadio.Group
