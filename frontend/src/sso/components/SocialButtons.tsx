import { Flex } from 'antd'
import { useEffect, useState } from 'react'
import { useNotifyModal } from '../../components/NoticeModal'
import SocialLoginButton, { type SocialLoginAction } from '../../components/SocialLoginButton'
import { getExperienceErrorMessage } from '../api/errors'
import { SOCIAL_CONNECTORS, startSocialSignIn } from '../social'

interface SocialButtonsProps {
  /** 按鈕文字：登入頁「快速登入」（預設）、註冊頁「創建帳號」；流程相同，都從登入開始、找不到帳號才註冊 */
  action?: SocialLoginAction
  /** 頁面其他操作進行中時停用 */
  disabled?: boolean
}

/**
 * Line、Google 社群登入按鈕（#58）。登入頁（#55）負責擺放位置與上方的「or」分隔線。
 * 按鈕樣式與會員中心登入頁共用 SocialLoginButton（#47 D12）。
 * 點擊後轉址到 Line／Google 授權，回來由 pages/SocialCallback.tsx 接手。
 * Google One Tap（Logto 有開）不做，待決定（#58）。
 */
export default function SocialButtons({ action = 'signIn', disabled }: SocialButtonsProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const { notify, contextHolder } = useNotifyModal()

  // 從 Line／Google 頁面按上一頁回來時，瀏覽器可能直接還原轉址前的畫面（bfcache），要解除 loading
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPendingId(null)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const handleClick = async (connectorId: string) => {
    if (pendingId) return
    setPendingId(connectorId)
    try {
      await startSocialSignIn(connectorId)
      // 成功會轉址離開，維持 loading 直到頁面換掉
    } catch (error) {
      setPendingId(null)
      void notify({ title: '通知', content: getExperienceErrorMessage(error, '社群登入暫時無法使用，請稍後再試') })
    }
  }

  return (
    <Flex vertical gap="middle">
      {contextHolder}
      {SOCIAL_CONNECTORS.map(({ provider, connectorId }) => (
        <SocialLoginButton
          key={connectorId}
          provider={provider}
          action={action}
          loading={pendingId === connectorId}
          disabled={disabled || (pendingId !== null && pendingId !== connectorId)}
          onClick={() => void handleClick(connectorId)}
        />
      ))}
    </Flex>
  )
}
