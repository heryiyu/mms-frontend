import type { ThemeConfig } from 'antd'
import { applyDesignCssVars } from './cssVars'
import { formControlComponents } from './components/formControls'
import { menuTheme } from './components/menu'
import { colors, fontFamily, layout, radius, shadows, typography } from './tokens'

// 讓 CSS Modules 也能用同一份 token（var(--color-*) 等），見 ./cssVars.ts
applyDesignCssVars()

// Ant Design 主題：全域 token 對應設計稿（docs/design/tokens.md）
// 元件層級的客製（Button、Input…）放在 ./components/<元件>.ts，再於下方 components 合併
// 參考：https://ant.design/docs/react/customize-theme
export const theme: ThemeConfig = {
  token: {
    // 色彩
    colorPrimary: colors.primary,
    colorInfo: colors.primary,
    colorLink: colors.primary,
    colorError: colors.error,
    colorSuccess: colors.success,
    colorWarning: colors.secondary2,
    colorText: colors.gray1,
    colorTextHeading: colors.gray1,
    colorTextSecondary: colors.gray2,
    colorTextTertiary: colors.gray3,
    colorTextQuaternary: colors.gray3,
    colorTextPlaceholder: colors.gray3,
    colorTextDisabled: colors.gray3,
    colorBorder: colors.gray4,
    colorBorderSecondary: colors.gray5,
    colorSplit: colors.gray5,
    colorBgLayout: colors.bgLayout,
    colorBgContainer: colors.white,
    colorBgElevated: colors.white,
    colorBgContainerDisabled: colors.gray4,
    colorBgMask: colors.mask,

    // 字體與字級（Body1 16px 為基準字級）
    fontFamily,
    fontSize: typography.body1.fontSize,
    fontSizeSM: typography.body2.fontSize,
    fontSizeLG: typography.bodyL.fontSize,
    fontSizeXL: typography.headline5.fontSize,
    fontSizeHeading1: typography.headline1.fontSize,
    fontSizeHeading2: typography.headline2.fontSize,
    fontSizeHeading3: typography.headline3.fontSize,
    fontSizeHeading4: typography.headline4.fontSize,
    fontSizeHeading5: typography.headline5.fontSize,
    lineHeight: typography.body1.lineHeight,
    lineHeightHeading1: typography.headline1.lineHeight,
    lineHeightHeading2: typography.headline2.lineHeight,
    lineHeightHeading3: typography.headline3.lineHeight,
    lineHeightHeading4: typography.headline4.lineHeight,
    lineHeightHeading5: typography.headline5.lineHeight,

    // 圓角、陰影、尺寸
    borderRadius: radius.md,
    borderRadiusSM: radius.sm,
    borderRadiusLG: radius.lg,
    boxShadow: shadows.shadow1,
    boxShadowSecondary: shadows.shadow2,
    boxShadowTertiary: shadows.shadow1,
    controlHeight: layout.controlHeight,
  },
  components: {
    ...formControlComponents,
    Menu: menuTheme,
  },
}
