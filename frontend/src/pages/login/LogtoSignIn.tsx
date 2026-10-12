import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { type LogtoFirstScreen, startSignIn } from '../../auth/logto'
import { Button } from '../../components/Button'
import { useNotifyModal } from '../../components/NoticeModal'
import GuestBrandHeader from '../../layouts/GuestBrandHeader'
import type { LoginRedirectState } from '../../routes/paths'
import LoginLoading from './LoginLoading'
import loginStyles from './Login.module.css'
import styles from './LogtoSignIn.module.css'

/**
 * Logto 模式（#44）的登入、註冊、忘記密碼頁：進入後直接轉址到 Logto 登入頁，期間顯示登入 loading 遮罩。
 * 自動轉址被防呆擋下（短時間內又回到這頁，見 src/auth/logto.ts）、從 Logto 按上一頁回來或轉址失敗時，
 * 改顯示手動按鈕（設計稿未畫）。
 */

/** 這三個路徑在 Logto 模式下的對應：/login 不傳；/register → register；/forgot-password → reset_password */
type FirstScreen = Extract<LogtoFirstScreen, 'register' | 'reset_password'>

const BUTTON_TEXT: Record<FirstScreen | 'signIn', string> = {
  signIn: '前往登入',
  register: '前往註冊',
  reset_password: '前往重設密碼',
}

export default function LogtoSignIn({ firstScreen }: { firstScreen?: FirstScreen }) {
  const location = useLocation()
  const from = (location.state as LoginRedirectState | null)?.from
  const [manual, setManual] = useState(false)
  const [starting, setStarting] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  useEffect(() => {
    let cancelled = false
    startSignIn({ from, firstScreen, auto: true })
      .then((result) => !cancelled && result === 'blocked' && setManual(true))
      .catch(() => !cancelled && setManual(true))
    return () => {
      cancelled = true
    }
  }, [from, firstScreen])

  // 從 Logto 頁按上一頁、由 bfcache 原樣還原時，遮罩會一直轉，改顯示手動按鈕
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setStarting(false)
        setManual(true)
      }
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const handleClick = async () => {
    setStarting(true)
    try {
      await startSignIn({ from, firstScreen })
    } catch {
      setStarting(false)
      void notify({ title: '通知', content: '無法連線到登入服務，請稍後再試' })
    }
  }

  return (
    <div className={loginStyles.page}>
      {contextHolder}
      <GuestBrandHeader />
      {manual && (
        <>
          <p className={styles.hint}>會員中心使用新生命 SSO 帳號登入</p>
          <Button block loading={starting} onClick={handleClick}>
            {BUTTON_TEXT[firstScreen ?? 'signIn']}
          </Button>
        </>
      )}
      <LoginLoading spinning={!manual} />
    </div>
  )
}
