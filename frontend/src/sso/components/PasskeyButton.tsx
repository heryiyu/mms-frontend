import { Button, type ButtonProps } from '../../components/Button'
import Icon from '../../components/Icon'

/** 按鈕文字：Logto 預設登入頁 zh-TW 的 action.sign_in_with（「通過 {{name}} 繼續」）＋ mfa.webauthn（「通行密鑰」），去掉中文間多餘的空白 */
export const PASSKEY_BUTTON_TEXT = '通過通行密鑰繼續'

/**
 * 「通過通行密鑰繼續」按鈕（#63），放在登入頁 Line、Google 按鈕下方。
 * TODO(#12)：設計稿沒有通行密鑰按鈕，外觀沿用社群按鈕（components/SocialLoginButton：白底黑框膠囊、滿版）；
 * Bootstrap Icons 沒有 passkey 圖示，先用最接近 FIDO 通行密鑰標誌（人像＋鑰匙）的 person-lock。
 */
export default function PasskeyButton(props: Omit<ButtonProps, 'variant' | 'icon' | 'block' | 'children'>) {
  return (
    <Button variant="secondary" block icon={<Icon name="person-lock" />} {...props}>
      {PASSKEY_BUTTON_TEXT}
    </Button>
  )
}
