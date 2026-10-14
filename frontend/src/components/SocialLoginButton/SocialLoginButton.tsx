import type { ReactNode } from 'react'
import { brandColors } from '../../theme/tokens'
import { Button, type ButtonProps } from '../Button'
import Icon from '../Icon'
import GoogleLogo from './GoogleLogo'

// 社群登入按鈕（docs/design/login/README.md「使用Line快速登入」、register「使用Line創建帳號」）：
// 白底黑框膠囊（secondary）滿版＋品牌色圖示。會員中心登入／註冊頁與 SSO 登入頁（src/sso，#58）共用（#47 D12）。
// 點擊後的流程各自不同（會員中心走自家後端、SSO 走 Logto Experience API），由呼叫端以 onClick 處理。

export type SocialProvider = 'line' | 'google'

/** 按鈕用途：登入（「快速登入」）或註冊（「創建帳號」） */
export type SocialLoginAction = 'signIn' | 'register'

const ACTION_TEXT: Record<SocialLoginAction, string> = { signIn: '快速登入', register: '創建帳號' }

const PROVIDERS: Record<SocialProvider, { icon: ReactNode; text: (action: SocialLoginAction) => string }> = {
  line: { icon: <Icon name="line" color={brandColors.line} />, text: (action) => `使用Line${ACTION_TEXT[action]}` },
  // 設計稿只有 Line；Google 照 Logto 預設登入頁（四色 G 商標、zh-TW 文字「通過 Google 繼續」，登入註冊同一句），
  // 外框沿用 Line 的膠囊讓兩顆對齊（2026-10-14 決定）
  google: { icon: <GoogleLogo />, text: () => '通過 Google 繼續' },
}

export interface SocialLoginButtonProps extends Omit<ButtonProps, 'variant' | 'icon' | 'block' | 'children'> {
  provider: SocialProvider
  /** 預設 signIn */
  action?: SocialLoginAction
}

export default function SocialLoginButton({ provider, action = 'signIn', ...rest }: SocialLoginButtonProps) {
  const { icon, text } = PROVIDERS[provider]
  return (
    <Button variant="secondary" block icon={icon} {...rest}>
      {text(action)}
    </Button>
  )
}
