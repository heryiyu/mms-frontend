import { Flex } from 'antd'
import { useState } from 'react'
import ContactEmailLink from '../../components/ContactEmailLink'
import { type LoginAccountField, type LoginValues, LoginView, useLoginSubmit } from '../../components/LoginView'
import type { NotifyOptions } from '../../components/NoticeModal'
import { PATHS } from '../../routes/paths'
import { ExperienceError, isExperienceError } from '../api/client'
import { goToRedirect, identify, initInteraction, submitInteraction, verifyPassword } from '../api/experience'
import PasskeyButton from '../components/PasskeyButton'
import PasskeySetup from '../components/PasskeySetup'
import SocialButtons from '../components/SocialButtons'
import { identifierRules, parseIdentifier } from '../identifier'
import { isPasskeyPreferred } from '../passkey'
import { memberCenterUrl, SSO_PATHS } from '../paths'
import { usePageRestored } from '../usePageRestored'
import { usePasskeySignIn } from '../usePasskeySignIn'
import { NOTICE_TITLE, useSsoNotice } from '../useSsoNotice'

// SSO 登入頁（#55）：email 或手機＋密碼。畫面和會員中心登入頁共用 LoginView（#47 D12）。
// 呼叫順序：initInteraction(SignIn) → verifyPassword → identify → submitInteraction → goToRedirect（src/sso/README.md）
// 錯誤一律用通知彈窗（同會員中心）；session.not_found（直接開網址、逾時）關閉彈窗後回會員中心重新登入（useSsoNotice）。
// TODO(#12)：SSO 的錯誤文案（帳號或密碼錯誤、帳號停用、逾時）設計稿未畫，暫用 api/errors.ts 的文字；loading 沿用會員中心遮罩。
//
// 和會員中心登入頁的差異：
// - 沒有「記住帳號」：Logto 的登入狀態由 SSO 決定，這頁無法控制（待確認是否要放）
// - Line 快速登入改成 SocialButtons（Line、Google，#58），位置同會員中心（「or」分隔線下方）
// - 「進度查詢」連到會員中心
// - 通行密鑰（#63）：Line、Google 下方「通過通行密鑰繼續」＋帳號欄位自動填入（usePasskeySignIn）；
//   submit 回 user.passkey_preferred（帳號還沒有通行密鑰）時改顯示「要建立通行密鑰嗎？」（PasskeySetup）

const ACCOUNT_FIELD: LoginAccountField = {
  rules: identifierRules(),
  placeholder: '請輸入電子信箱或手機號碼',
  label: '電子信箱或手機號碼',
  // 通行密鑰自動填入（Logto allowAutofill）：瀏覽器在帳號欄位的建議清單列出通行密鑰；沒開或不支援時瀏覽器忽略 webauthn
  autoComplete: 'username webauthn',
}

const LINKS = {
  progress: memberCenterUrl(PATHS.progress),
  forgotPassword: SSO_PATHS.resetPassword,
  register: SSO_PATHS.register,
}

const TOO_MANY_ATTEMPTS = 'session.verification_blocked_too_many_attempts'

/** 帳號停用：比照會員中心「帳號鎖定」彈窗，聯繫教會信箱（設計師註記） */
const SUSPENDED_NOTICE: NotifyOptions = {
  title: NOTICE_TITLE,
  content: (
    <>
      {'帳號已停用\n\n請聯繫'}
      <ContactEmailLink />
    </>
  ),
}

export default function SignIn() {
  const { submitting, begin, end } = useLoginSubmit()
  const { notify, notifyError, contextHolder } = useSsoNotice()
  const [askPasskey, setAskPasskey] = useState(false)

  // 登入成功轉址後按上一頁、由 bfcache 原樣還原時，loading 遮罩會一直轉：收起來讓使用者能重新操作
  usePageRestored(end)

  const showError = (error: unknown) =>
    isExperienceError(error, 'user.suspended') ? notify(SUSPENDED_NOTICE) : notifyError(error, '登入失敗，請稍後再試')

  const passkey = usePasskeySignIn({ onError: (error) => void showError(error) })

  const handleFinish = async ({ account, password }: LoginValues) => {
    // 欄位驗證已擋掉格式不符，這裡只是讓型別收斂
    const identifier = parseIdentifier(account)
    if (!identifier) return
    const status = begin()
    if (status === 'busy') return
    if (status === 'cooldown') {
      void showError(new ExperienceError(400, TOO_MANY_ATTEMPTS, ''))
      return
    }
    try {
      // 每次送出都重新開始 interaction，清掉前一次失敗留下的驗證紀錄
      await initInteraction('SignIn')
      const { verificationId } = await verifyPassword(identifier, password)
      await identify(verificationId)
      const { redirectTo } = await submitInteraction()
      // 成功：轉回 Logto 完成 OIDC，再導回原網站；維持 loading 遮罩到離開頁面
      goToRedirect(redirectTo)
    } catch (error) {
      end({ cooldown: isExperienceError(error, TOO_MANY_ATTEMPTS) })
      if (isPasskeyPreferred(error)) {
        // 密碼正確、帳號還沒有通行密鑰：先詢問建立（停掉自動填入，避免和建立的系統視窗衝突）
        passkey.stopAutofill()
        setAskPasskey(true)
        return
      }
      void showError(error)
    }
  }

  if (askPasskey) return <PasskeySetup />

  return (
    <>
      {contextHolder}
      <LoginView
        account={ACCOUNT_FIELD}
        showRemember={false}
        submitting={submitting || passkey.verifying}
        onFinish={handleFinish}
        links={LINKS}
        social={
          <Flex vertical gap="middle">
            <SocialButtons disabled={passkey.buttonPending} />
            {passkey.showButton && (
              <PasskeyButton loading={passkey.buttonPending} onClick={() => void passkey.signInWithButton()} />
            )}
          </Flex>
        }
      />
    </>
  )
}
