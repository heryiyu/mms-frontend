import type { ThemeConfig } from 'antd'
import { colors } from '../../theme/tokens'

// 各按鈕變體的 Ant Design component token（docs/design/components/README.md「Button」「TextButton」）
// 用巢狀 ConfigProvider 套用，不動全域 theme，避免影響其他用到 AntD Button 的地方（例如 Modal 預設 footer）

type ButtonToken = NonNullable<NonNullable<ThemeConfig['components']>['Button']>

/** 把 #RRGGBB 轉成指定不透明度的 rgba()，讓 hover 色仍從 token 推導、不寫死色碼 */
const withAlpha = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// 共通停用樣式（元件頁 Disabled：gray4 底、gray3 框、gray2 字）
const disabled: ButtonToken = {
  colorBgContainerDisabled: colors.gray4,
  colorBorderDisabled: colors.gray3,
  colorTextDisabled: colors.gray2,
}

// 主要按鈕：黑底（gray1）白字膠囊。AntD 寫法 color="default" variant="solid"
// TODO(#12)：元件頁第 4 個變體（gray1 80% 不透明度）推測為 hover／pressed，active 暫與 hover 相同
export const primaryButtonTheme: ButtonToken = {
  ...disabled,
  colorBgSolid: colors.gray1,
  colorBgSolidHover: withAlpha(colors.gray1, 0.8),
  colorBgSolidActive: withAlpha(colors.gray1, 0.8),
  solidTextColor: colors.white,
}

// 次要按鈕：白底黑框膠囊。AntD 寫法 color="default" variant="outlined"
// TODO(#12)：元件頁寫底色「透明」、tokens.md／issue 寫「白底」，暫用白底；hover／active 稿未畫，暫用 gray6／gray5 底
export const secondaryButtonTheme: ButtonToken = {
  ...disabled,
  defaultBg: colors.white,
  defaultColor: colors.gray1,
  defaultBorderColor: colors.gray1,
  defaultHoverBg: colors.gray6,
  defaultHoverColor: colors.gray1,
  defaultHoverBorderColor: colors.gray1,
  defaultActiveBg: colors.gray5,
  defaultActiveColor: colors.gray1,
  defaultActiveBorderColor: colors.gray1,
  defaultBgDisabled: colors.gray4,
}

// 文字按鈕：主色文字（連結、「退回」等）。AntD 寫法 color="primary" variant="link"，hover／active 用 AntD 由主色推導的色階
// TODO(#12)：文字按鈕停用色稿未畫，沿用全域 colorTextDisabled（gray3）
export const textButtonTheme: ButtonToken = {}

const ADD_BUTTON_HEIGHT = 32 // 元件頁目測 65 × 32px，僅此元件使用故不放全域 token

// 新增按鈕（Figma 元件名「TextButton」：「＋ XX」小型按鈕）：主色淺底、主色框字、圓角 8px、高約 32px
// TODO(#12)：Figma 的「TextButton」與 issue #2 的「文字按鈕」（主色文字連結）語意不同，此處命名為 AddButton 區隔；尺寸為目測
export const addButtonTheme: ButtonToken = {
  colorBgContainer: colors.primaryBg,
  controlHeight: ADD_BUTTON_HEIGHT,
  colorBgContainerDisabled: colors.gray5,
  colorBorderDisabled: colors.gray3,
  colorTextDisabled: colors.gray2,
}
