// 設計稿的原始 design token（docs/design/tokens.md，Figma「⭕Design system」頁）
// 這裡是唯一來源：Ant Design 主題（./index.ts）與 CSS 變數（./cssVars.ts）都從這裡取值

export const colors = {
  primary: '#5A4FDE', // Maincolor/1
  primaryLight: '#AAABFF', // Maincolor/2
  primaryBg: 'rgba(170, 171, 255, 0.2)', // Maincolor/3：#AAABFF 透明度 20%
  secondary1: '#F6CB0E', // Sec/1 黃
  secondary2: '#EF8D2E', // Sec/2 橘
  error: '#D61C33',
  success: '#63D056',
  gray1: '#1C1C1E', // 主要文字、主要按鈕底色
  gray2: '#6C6C70', // 次要文字
  gray3: '#AEAEB2', // placeholder、停用文字
  gray4: '#D4D4D9', // 停用按鈕底色、框線
  gray5: '#E5E5EA', // 分隔線
  gray6: '#F4F4F4', // 區塊底色
  bgLayout: '#F7F8FA',
  white: '#FFFFFF',
  mask: 'rgba(0, 0, 0, 0.25)', // 彈窗遮罩（目測）
} as const

// 第三方品牌色：不屬於設計系統色票（docs/design/tokens.md），也不產生 CSS 變數、不進 AntD 主題
export const brandColors = {
  line: '#06C755', // LINE 品牌綠（「使用Line快速登入」圖示，LINE 官方色）
} as const

export const fontFamily =
  "Roboto, 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface TypeStyle {
  fontSize: number
  lineHeight: number
  letterSpacing: number // 設計稿未標單位，暫定 px
}

const headline = (fontSize: number): TypeStyle => ({ fontSize, lineHeight: 1.2, letterSpacing: 0.2 })
const body = (fontSize: number): TypeStyle => ({ fontSize, lineHeight: 1.5, letterSpacing: 0.5 })

export const typography = {
  headline1: headline(48),
  headline2: headline(42),
  headline3: headline(36),
  headline4: headline(24),
  headline5: headline(20),
  bodyL: body(18),
  body1: body(16),
  body2: body(14),
  caption: body(12),
} as const

export const shadows = {
  shadow1: '0 4px 12px rgba(0, 0, 0, 0.08)',
  shadow2: '0 2px 8px rgba(0, 0, 0, 0.15)',
} as const

export const radius = {
  sm: 4,
  md: 8, // 輸入框
  lg: 12, // 卡片、彈窗、Banner
} as const

// 版面尺寸（docs/design/layout/README.md）
export const layout = {
  siderWidth: 220,
  authCardWidth: 420,
  guestFormPaddingDesktop: 120, // 未登入全寬表單（註冊會員資料）左右邊距（目測）
  guestActionBarHeight: 64, // 未登入全寬表單底部為 <ActionBar fixed> 預留的高度（目測）
  mobileTopBarHeight: 48,
  breadcrumbBarHeight: 45,
  pagePaddingDesktop: 40, // 未登入頁四周留白
  pagePaddingMobile: 20,
  contentPaddingDesktop: 60, // 登入後內容區左右內距（目測）
  modalWidth: 480,
  controlHeight: 40, // 輸入框、按鈕高度
} as const
