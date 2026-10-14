import { brandColors } from '../../theme/tokens'
import { Button, type ButtonProps } from '../Button'
import Icon from '../Icon'

// 社群登入按鈕（docs/design/login/README.md「使用Line快速登入」、register「使用Line創建帳號」）：
// 白底黑框膠囊（secondary）滿版＋品牌色圖示。會員中心登入／註冊頁與 SSO 登入頁（src/sso，#58）共用（#47 D12）。
// 點擊後的流程各自不同（會員中心走自家後端、SSO 走 Logto Experience API），由呼叫端以 onClick 處理。

export type SocialProvider = 'line' | 'google'

/** 按鈕用途：登入（「快速登入」）或註冊（「創建帳號」） */
export type SocialLoginAction = 'signIn' | 'register'

const PROVIDERS: Record<SocialProvider, { name: string; icon: string; color: string }> = {
  line: { name: 'Line', icon: 'line', color: brandColors.line },
  // TODO(#12)：設計稿只有 Line，Google 按鈕照 Line 的樣式補（文字、圖示顏色待設計確認）
  google: { name: 'Google', icon: 'google', color: brandColors.google },
}

const ACTION_TEXT: Record<SocialLoginAction, string> = { signIn: '快速登入', register: '創建帳號' }

export interface SocialLoginButtonProps extends Omit<ButtonProps, 'variant' | 'icon' | 'block' | 'children'> {
  provider: SocialProvider
  /** 預設 signIn */
  action?: SocialLoginAction
}

export default function SocialLoginButton({ provider, action = 'signIn', ...rest }: SocialLoginButtonProps) {
  const { name, icon, color } = PROVIDERS[provider]
  return (
    <Button variant="secondary" block icon={<Icon name={icon} color={color} />} {...rest}>
      {`使用${name}${ACTION_TEXT[action]}`}
    </Button>
  )
}
