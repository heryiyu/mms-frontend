import type { ThemeConfig } from 'antd'

// Ant Design 主題設定：拿到 Figma 後把色票、字體、圓角等改成設計稿的 design token
// 參考：https://ant.design/docs/react/customize-theme
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif",
  },
  components: {},
}
