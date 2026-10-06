import { Tag } from 'antd'
import type { CSSProperties, ComponentProps } from 'react'
import { formControlSize } from '../../theme/components/formControls'
import { cx } from '../../utils/cx'
import styles from './formControls.module.css'

export type FilterChipProps = ComponentProps<typeof Tag.CheckableTag>

const chipVars = { '--chip-padding-inline': `${formControlSize.chipPaddingInline}px` } as CSSProperties

// 篩選 chip（docs/design/components Loc，例：「全部」）：膠囊形、高 40px、BodyL
// default 白底 gray3 框 gray2 字；selected 為 colorPrimaryBg 底、主色框與字（AntD 預設是實心主色）
// TODO(#12): 實際使用場景（會員審核清單篩選？）與篩選規則待確認
export default function FilterChip({ className, style, ...props }: FilterChipProps) {
  return <Tag.CheckableTag className={cx(styles.chip, className)} style={{ ...chipVars, ...style }} {...props} />
}
