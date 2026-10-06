import { Button as AntButton, ConfigProvider, type ButtonProps as AntButtonProps, type ThemeConfig } from 'antd'
import { primaryButtonTheme, secondaryButtonTheme, textButtonTheme } from './buttonThemes'

export type ButtonVariant = 'primary' | 'secondary' | 'text'

export interface ButtonProps extends Omit<AntButtonProps, 'type' | 'color' | 'variant' | 'shape'> {
  /** primary：黑底白字膠囊（預設）；secondary：白底黑框膠囊；text：主色文字（連結、「退回」等） */
  variant?: ButtonVariant
}

// 各變體對應的 AntD 寫法與 component token；theme 物件為模組常數，避免每次 render 重建
const variantConfig: Record<ButtonVariant, { props: AntButtonProps; theme: ThemeConfig }> = {
  primary: {
    props: { color: 'default', variant: 'solid', shape: 'round' },
    theme: { components: { Button: primaryButtonTheme } },
  },
  secondary: {
    props: { color: 'default', variant: 'outlined', shape: 'round' },
    theme: { components: { Button: secondaryButtonTheme } },
  },
  text: {
    props: { color: 'primary', variant: 'link' },
    theme: { components: { Button: textButtonTheme } },
  },
}

/**
 * 通用按鈕（docs/design/components/README.md「Button」）。
 * 以 AntD Button 包一層，hover／active／disabled／loading 狀態沿用 AntD 行為，色彩由 ./buttonThemes.ts 的 token 控制。
 * 寬度依內容；需要滿版時傳 `block`。
 */
export default function Button({ variant = 'primary', ...rest }: ButtonProps) {
  const { props, theme } = variantConfig[variant]
  return (
    <ConfigProvider theme={theme}>
      <AntButton {...props} {...rest} />
    </ConfigProvider>
  )
}
