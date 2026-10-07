import type { FormProps } from 'antd'
import { formControlSize } from '../../theme/components/formControls'

/** 搭配 FormCard 的 Form 版面屬性：標籤靠左、固定欄寬，欄位吃剩餘寬度 */
export const formCardLayout = {
  labelAlign: 'left',
  labelCol: { flex: `0 0 ${formControlSize.labelWidth}px` },
  // 字串 flex 原樣輸出；數字 1 會被轉成「1 1 auto」，xs 時欄位會被擠到下一行
  wrapperCol: { flex: '1 1 0' },
} satisfies Pick<FormProps, 'labelAlign' | 'labelCol' | 'wrapperCol'>
