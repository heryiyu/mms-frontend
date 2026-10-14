import { useEffect } from 'react'
import ContactEmailLink from '../../components/ContactEmailLink'
import { type LoginAccountField, type LoginValues, LoginView, useLoginSubmit } from '../../components/LoginView'
import { type NotifyOptions, useNotifyModal } from '../../components/NoticeModal'
import { PATHS } from '../../routes/paths'
import { ExperienceError, isExperienceError } from '../api/client'
import { getExperienceErrorMessage } from '../api/errors'
import { goToRedirect, identify, initInteraction, submitInteraction, verifyPassword } from '../api/experience'
import SocialButtons from '../components/SocialButtons'
import { identifierRules, parseIdentifier } from '../identifier'
import { memberCenterUrl, SSO_PATHS } from '../paths'

// SSO 登入頁（#55）：email 或手機＋密碼。畫面和會員中心登入頁共用 LoginView（#47 D12）。
// 呼叫順序：initInteraction(SignIn) → verifyPassword → identify → submitInteraction → goToRedirect（src/sso/README.md）
// 錯誤一律用通知彈窗（同會員中心）；session.not_found（直接開網址、逾時）關閉彈窗後回會員中心重新登入。
// TODO(#12)：SSO 的錯誤文案（帳號或密碼錯誤、帳號停用、逾時）設計稿未畫，暫用 api/errors.ts 的文字；loading 沿用會員中心遮罩。
//
// 和會員中心登入頁的差異：
// - 沒有「記住帳號」：Logto 的登入狀態由 SSO 決定，這頁無法控制（待確認是否要放）
// - Line 快速登入改成 SocialButtons（Line、Google，#58 實作）
// - 「進度查詢」連到會員中心

const ACCOUNT_FIELD: LoginAccountField = {
  rules: identifierRules(),
  placeholder: '請輸入電子信箱或手機號碼',
  label: '電子信箱或手機號碼',
}

const LINKS = {
  progress: memberCenterUrl(PATHS.progress),
  forgotPassword: SSO_PATHS.resetPassword,
  register: SSO_PATHS.register,
}

const TOO_MANY_ATTEMPTS = 'session.verification_blocked_too_many_attempts'

/** 標題一律「通知」（同會員中心 loginErrors.tsx） */
function getSignInNotice(error: unknown): NotifyOptions {
  if (isExperienceError(error, 'user.suspended')) {
    // 比照會員中心「帳號鎖定」彈窗：聯繫教會信箱（設計師註記）
    return {
      title: '通知',
      content: (
        <>
          {'帳號已停用\n\n請聯繫'}
          <ContactEmailLink />
        </>
      ),
    }
  }
  return { title: '通知', content: getExperienceErrorMessage(error, '登入失敗，請稍後再試') }
}

export default function SignIn() {
  const { submitting, begin, end } = useLoginSubmit()
  const { notify, contextHolder } = useNotifyModal()

  // 登入成功轉址後按上一頁、由 bfcache 原樣還原時，loading 遮罩會一直轉：收起來讓使用者能重新操作
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) end()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [end])

  const handleFinish = async ({ account, password }: LoginValues) => {
    // 欄位驗證已擋掉格式不符，這裡只是讓型別收斂
    const identifier = parseIdentifier(account)
    if (!identifier) return
    const status = begin()
    if (status === 'busy') return
    if (status === 'cooldown') {
      void notify(getSignInNotice(new ExperienceError(400, TOO_MANY_ATTEMPTS, '')))
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
      if (isExperienceError(error, 'session.not_found')) {
        await notify(getSignInNotice(error))
        window.location.assign(memberCenterUrl(PATHS.login))
        return
      }
      void notify(getSignInNotice(error))
    }
  }

  return (
    <>
      {contextHolder}
      <LoginView
        account={ACCOUNT_FIELD}
        showRemember={false}
        submitting={submitting}
        onFinish={handleFinish}
        links={LINKS}
        social={<SocialButtons />}
      />
    </>
  )
}
