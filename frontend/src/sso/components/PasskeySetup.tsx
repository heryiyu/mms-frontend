import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import Icon from '../../components/Icon'
import { LoginLoading } from '../../components/LoginView'
import { RegisterBackLink, RegisterCard } from '../../components/RegisterCard'
import { ExperienceError } from '../api/client'
import { goToRedirect } from '../api/experience'
import { bindPasskeyAndSubmit, type PasskeyRegistration, preparePasskeyRegistration, skipPasskeyAndSubmit } from '../passkey'
import { usePageRestored } from '../usePageRestored'
import { useSsoNotice } from '../useSsoNotice'
import { isWebAuthnAlreadyRegistered, isWebAuthnCancelled, isWebAuthnSupported } from '../webauthn'
import styles from './PasskeySetup.module.css'

/**
 * 「要建立通行密鑰嗎？」（#63）：submit 回 user.passkey_preferred 時顯示（註冊最後一步、密碼登入、社群登入都可能），
 * 照 Logto 預設登入頁的 PasskeySetup：建立 → 綁到帳號後完成登入；略過 → 直接完成登入。
 * - 這時帳號已建立／已登入成功，只差 submit：建立失敗或取消都留在這頁，可以再試或略過，不影響註冊／登入
 * - 瀏覽器不支援 WebAuthn：不詢問，直接略過（註冊時 Logto 只略過這一次；登入時 Logto 會記在帳號上，之後不再詢問）
 * - 一出現就先向 Logto 取 options，按「建立」時才能直接叫出系統視窗（Safari 要求緊接在點擊之後）
 *
 * TODO(#12)：設計稿沒有這個畫面，先沿用「創建帳號」卡片版面（RegisterCard）：標題、說明、主要按鈕「建立通行密鑰」、
 * 卡片底部「略過」（同「返回」的樣式）；文字為推測（Logto zh-TW 是「簡化你的登入／建立通行密鑰」）。
 */
export default function PasskeySetup() {
  const supported = isWebAuthnSupported()
  const [registration, setRegistration] = useState<PasskeyRegistration | null>(null)
  const [pending, setPending] = useState<'create' | 'skip' | null>(supported ? null : 'skip')
  const { notifyError, contextHolder } = useSsoNotice()
  const startedRef = useRef(false)

  // 轉址回原網站後按上一頁、由 bfcache 還原時，收起 loading
  usePageRestored(useCallback(() => setPending(null), []))

  const prepare = useCallback(async () => {
    try {
      setRegistration(await preparePasskeyRegistration())
    } catch {
      // 取不到（網路等）先不提示，按「建立」時會再取一次並顯示錯誤
    }
  }, [])

  useEffect(() => {
    // StrictMode 會執行兩次 effect；略過與 options 都只做一次
    if (startedRef.current) return
    startedRef.current = true
    // 不支援時 pending 一開始就是 skip
    if (!supported) {
      skipPasskeyAndSubmit()
        .then(goToRedirect)
        .catch((error: unknown) => {
          setPending(null)
          void notifyError(error)
        })
      return
    }
    preparePasskeyRegistration()
      .then(setRegistration)
      // 取不到（網路等）先不提示，按「建立」時會再取一次並顯示錯誤
      .catch(() => undefined)
  }, [notifyError, supported])

  const handleSkip = async () => {
    if (pending) return
    setPending('skip')
    try {
      goToRedirect(await skipPasskeyAndSubmit())
    } catch (error) {
      setPending(null)
      void notifyError(error)
    }
  }

  const handleCreate = async () => {
    if (pending) return
    setPending('create')
    let current = registration
    try {
      current ??= await preparePasskeyRegistration()
      const credential = await navigator.credentials.create({ publicKey: current.options })
      if (!(credential instanceof PublicKeyCredential)) throw new ExperienceError(0, 'passkey_create_failed', 'no credential')
      // 轉址期間維持 loading
      goToRedirect(await bindPasskeyAndSubmit(current.verificationId, credential))
    } catch (error) {
      setPending(null)
      // 使用者取消：安靜回到原狀，同一份 options 可以再用
      if (isWebAuthnCancelled(error)) {
        if (current && !registration) setRegistration(current)
        return
      }
      // 其他失敗：驗證紀錄可能已用掉，重新取一份
      setRegistration(null)
      void prepare()
      if (error instanceof ExperienceError) {
        void notifyError(error)
      } else {
        const code = isWebAuthnAlreadyRegistered(error) ? 'passkey_already_registered' : 'passkey_create_failed'
        void notifyError(new ExperienceError(0, code, String(error)))
      }
    }
  }

  return (
    <RegisterCard
      title="要建立通行密鑰嗎？"
      footer={
        <RegisterBackLink onClick={() => void handleSkip()} disabled={pending !== null}>
          略過
        </RegisterBackLink>
      }
    >
      {contextHolder}
      <p className={styles.description}>
        下次登入不必輸入密碼，用這台裝置的指紋、臉部辨識或螢幕鎖定就能登入。也可以先略過，照原本的方式登入。
      </p>
      <Button block icon={<Icon name="person-lock" />} loading={pending === 'create'} onClick={() => void handleCreate()}>
        建立通行密鑰
      </Button>
      <LoginLoading spinning={pending === 'skip'} />
    </RegisterCard>
  )
}
