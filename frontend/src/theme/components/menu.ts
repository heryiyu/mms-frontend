import type { ThemeConfig } from 'antd'
import { colors, radius } from '../tokens'

// 登入後側邊選單／手機抽屜選單的 Menu 客製（docs/design/layout/README.md 第 4 節）
// default：透明底、gray1 文字；hover：colorPrimaryBg 底；selected：colorPrimaryBg 底 + 1px colorPrimary 框（框線在 MemberLayout.module.css）
// 文字在任何狀態都不變色。項目 196×32（側欄 220 左右各內縮 12）、圓角 4、上下間距 8。
// 於 ../index.ts 的 components.Menu 全域套用。
export const menuTheme: NonNullable<ThemeConfig['components']>['Menu'] = {
  itemHeight: 32,
  itemMarginInline: 12,
  itemMarginBlock: 4,
  itemPaddingInline: 8,
  itemBorderRadius: radius.sm,
  itemColor: colors.gray1,
  itemHoverColor: colors.gray1,
  itemSelectedColor: colors.gray1,
  itemActiveBg: colors.primaryBg,
  itemHoverBg: colors.primaryBg,
  itemSelectedBg: colors.primaryBg,
  itemBg: 'transparent',
  activeBarBorderWidth: 0,
}
