import { Button as AntButton, ConfigProvider, type ButtonProps as AntButtonProps, type ThemeConfig } from 'antd'
import Icon from '../Icon'
import { addButtonTheme } from './buttonThemes'

export type AddButtonProps = Omit<AntButtonProps, 'type' | 'color' | 'variant' | 'shape'>

const theme: ThemeConfig = { components: { Button: addButtonTheme } }

/**
 * 新增／附加動作的小按鈕（Figma 元件名「TextButton」，內容為「＋ XX」）。
 * 主色淺底＋主色框字、圓角 8px；預設圖示 bi-plus，可用 `icon` 覆寫。
 */
export default function AddButton({ icon = <Icon name="plus" />, ...rest }: AddButtonProps) {
  return (
    <ConfigProvider theme={theme}>
      <AntButton color="primary" variant="outlined" icon={icon} {...rest} />
    </ConfigProvider>
  )
}
