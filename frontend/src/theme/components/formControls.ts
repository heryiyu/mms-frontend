import type { ThemeConfig } from 'antd'
import { colors } from '../tokens'

// 表單元件（Input、Checkbox、Radio、Switch、Form）的 component token
// 規格：docs/design/components/README.md（Input、title Input、checkbox、Radio、Switch BTN）
// token 做不到的部分（error 框線不變色、Switch 把手圖示、Radio hover…）在 src/components/form/*.module.css 客製

// 尺寸（元件頁目測值，給 token 與 CSS 變數共用）
export const formControlSize = {
  // title Input 標籤欄寬（目測約 100px）
  labelWidth: 100,
  // Switch BTN：約 42 × 24、把手約 20（目測）
  switchTrackWidth: 42,
  switchTrackHeight: 24,
  switchHandleSize: 20,
  switchTrackPadding: 2,
  // Checkbox / Radio：16 × 16
  checkSize: 16,
  radioDotSize: 8,
  // Loc 篩選 chip 左右內距（約 65 × 40 推算，目測）
  chipPaddingInline: 16,
} as const

export const formControlComponents: NonNullable<ThemeConfig['components']> = {
  Input: {
    // TODO(#12): 元件頁框線為 gray3，tokens.md／issue 寫 gray4；先依元件頁截圖用 gray3
    colorBorder: colors.gray3,
    hoverBorderColor: colors.primary,
    activeBorderColor: colors.primary,
    // 設計稿 focus 只有 1px 主色框線，沒有外光暈
    activeShadow: 'none',
    errorActiveShadow: 'none',
  },
  Checkbox: {
    colorBorder: colors.gray3,
    controlInteractiveSize: formControlSize.checkSize,
  },
  Radio: {
    colorBorder: colors.gray3,
    radioSize: formControlSize.checkSize,
    dotSize: formControlSize.radioDotSize,
    // wireframe 模式下 checked 為「主色外圈＋主色圓點、底色透明」，與設計稿一致
    wireframe: true,
  },
  Switch: {
    trackHeight: formControlSize.switchTrackHeight,
    trackMinWidth: formControlSize.switchTrackWidth,
    handleSize: formControlSize.switchHandleSize,
    trackPadding: formControlSize.switchTrackPadding,
    handleShadow: 'none',
  },
  Form: {
    labelColor: colors.gray2,
    labelRequiredMarkColor: colors.error,
  },
}
