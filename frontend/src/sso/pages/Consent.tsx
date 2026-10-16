import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/Button'
import Icon from '../../components/Icon'
import { LoginLoading } from '../../components/LoginView'
import { RegisterBackLink, RegisterCard } from '../../components/RegisterCard'
import ResultPage from '../../components/ResultPage'
import { isExperienceError } from '../api/client'
import { consent, getConsentInfo, type ConsentInfo } from '../api/consent'
import { getExperienceErrorMessage } from '../api/errors'
import { goToRedirect } from '../api/experience'
import { SSO_PATHS } from '../paths'
import { usePageRestored } from '../usePageRestored'
import { useSsoNotice } from '../useSsoNotice'
import styles from './Consent.module.css'

/** Logto 保留的組織 resource：組織權限已經算在 OIDC scope 裡，不重複列（同 Logto 原登入頁） */
const ORGANIZATION_RESOURCE = 'urn:logto:resource:organizations'

/** OIDC scope 的說明，文字改寫自 Logto zh-TW（user_scopes.descriptions），用「您」與本站一致 */
const USER_SCOPE_DESCRIPTIONS: Record<string, string> = {
  profile: '您的姓名、使用者名稱、頭像等個人資料',
  email: '您的電子信箱',
  phone: '您的手機號碼',
  address: '您的地址',
  custom_data: '您的自訂資料',
  identities: '您連結的社群帳號',
  roles: '您的角色',
  'urn:logto:scope:organizations': '您的組織資訊',
  'urn:logto:scope:organization_roles': '您的組織角色',
  'urn:logto:scope:sessions': '您的登入裝置',
}

/** 要列給使用者看的權限：OIDC scope＋API resource 權限（openid、offline_access Logto 不會放進 missingOIDCScope） */
function scopeItems(info: ConsentInfo) {
  const userScopes = (info.missingOIDCScope ?? []).map((scope) => USER_SCOPE_DESCRIPTIONS[scope] ?? scope)
  const resourceScopes = (info.missingResourceScopes ?? [])
    .filter(({ resource }) => resource.id !== ORGANIZATION_RESOURCE)
    .flatMap(({ resource, scopes }) => scopes.map((scope) => `${resource.name}：${scope.description || scope.name}`))
  return [...userScopes, ...resourceScopes]
}

/** 導回網址只顯示 origin（網址參數可能帶敏感資料）；非 http 的 App scheme（io.logto://…）照原樣顯示，同 Logto 原登入頁 */
function redirectOrigin(redirectUri: string | undefined) {
  if (!redirectUri) return undefined
  try {
    const url = new URL(redirectUri)
    return url.protocol.startsWith('http') ? url.origin : redirectUri
  } catch {
    return undefined
  }
}

type Failure = { kind: 'denied' } | { kind: 'error'; description: string }

/**
 * 第三方 App 的授權同意頁（/consent，#74）。讀經 App、LearnMe 等在 Logto 設成「第三方應用程式」的 App，
 * 登入完成後 Logto 會先導到這頁，使用者按「授權」才回到 App。行為照 Logto 1.42.0 原登入頁 pages/Consent：
 * - 取消：直接回 App 的導回網址（不帶授權碼，App 會當作沒登入）
 * - 使用其他帳號：回登入頁重新登入（同一個 interaction，登入完會再回到這頁）
 * - oidc.access_denied（帳號沒有使用這個 App 的權限）：顯示無法使用，可以登出換帳號
 * - 組織選擇：目前用這個 SSO 的 App 都沒要求組織權限，先不做選擇畫面，有的話照 Logto 預設選第一個
 *
 * TODO(#12)：設計稿沒有這頁，版面沿用「創建帳號」卡片（RegisterCard），文字改寫自 Logto zh-TW。
 */
export default function Consent() {
  const [info, setInfo] = useState<ConsentInfo | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [pending, setPending] = useState(false)
  const { notifyError, contextHolder } = useSsoNotice()
  const startedRef = useRef(false)

  // 轉址回 App 後按上一頁、由 bfcache 還原時，收起 loading
  usePageRestored(useCallback(() => setPending(false), []))

  const handleError = useCallback(
    (error: unknown) => {
      if (isExperienceError(error, 'oidc.access_denied')) {
        setFailure({ kind: 'denied' })
        return
      }
      // 逾時：不知道是從哪個 App 來的，不能照其他頁回會員中心（第三方 App 的使用者不一定是會員中心的會員）
      if (isExperienceError(error, 'session.not_found')) {
        setFailure({ kind: 'error', description: getExperienceErrorMessage(error) })
        return
      }
      void notifyError(error)
    },
    [notifyError],
  )

  useEffect(() => {
    // StrictMode 會執行兩次 effect
    if (startedRef.current) return
    startedRef.current = true
    getConsentInfo()
      .then(setInfo)
      .catch((error: unknown) => {
        // 讀不到資料就沒有畫面可以顯示，一律改顯示失敗頁
        if (isExperienceError(error, 'oidc.access_denied')) setFailure({ kind: 'denied' })
        else setFailure({ kind: 'error', description: getExperienceErrorMessage(error, '無法取得授權資料，請回到原網站重新登入') })
      })
  }, [])

  const signOut = () => {
    // 同 Logto 原登入頁：結束 SSO 登入狀態，之後回到 App 重新登入
    const url = new URL('/oidc/session/end', window.location.origin)
    const appId = info?.application.id ?? new URLSearchParams(window.location.search).get('app_id')
    if (appId) url.searchParams.set('client_id', appId)
    window.location.assign(url.href)
  }

  const handleAuthorize = async () => {
    if (pending || !info) return
    setPending(true)
    try {
      // 轉址期間維持 loading
      goToRedirect((await consent(info.organizations?.[0]?.id)).redirectTo)
    } catch (error) {
      setPending(false)
      handleError(error)
    }
  }

  if (failure?.kind === 'denied') {
    return (
      <ResultPage
        status="error"
        title="無法使用這個 App"
        description="您的帳號沒有使用這個 App 的權限，可以登出後改用其他帳號登入。"
        backText="登出"
        onBack={signOut}
      />
    )
  }
  if (failure) return <ResultPage status="error" title="授權失敗" description={failure.description} />
  if (!info) return <LoginLoading spinning />

  const { application, user, redirectUri } = info
  const appName = application.displayName || application.name
  const scopes = scopeItems(info)
  const origin = redirectOrigin(redirectUri)
  const { termsOfUseUrl, privacyPolicyUrl } = application
  const logoUrl = application.branding?.logoUrl

  return (
    <RegisterCard
      title={`授權 ${appName}`}
      footer={
        <>
          不是您？<RegisterBackLink to={SSO_PATHS.signIn}>使用其他帳號</RegisterBackLink>
        </>
      }
    >
      {contextHolder}
      {logoUrl && <img src={logoUrl} alt="" className={styles.logo} />}

      <div className={styles.user}>
        {user.avatar ? (
          <img src={user.avatar} alt="" className={styles.avatar} />
        ) : (
          <Icon name="person-circle" className={styles.avatarIcon} />
        )}
        <div className={styles.userText}>
          <div className={styles.userName}>{user.name || user.primaryEmail || user.primaryPhone || user.username}</div>
          {user.name && <div className={styles.userId}>{user.primaryEmail || user.primaryPhone || user.username}</div>}
        </div>
      </div>

      {scopes.length > 0 && (
        <section className={styles.scopes} aria-label="授權內容">
          <p className={styles.scopesTitle}>{appName} 將可以讀取：</p>
          <ul className={styles.scopeList}>
            {scopes.map((scope) => (
              <li key={scope}>
                <Icon name="check2" className={styles.scopeIcon} />
                {scope}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.actions}>
        <Button block loading={pending} onClick={() => void handleAuthorize()}>
          授權
        </Button>
        {redirectUri && (
          <Button block variant="secondary" disabled={pending} onClick={() => window.location.replace(redirectUri)}>
            取消
          </Button>
        )}
      </div>

      {(termsOfUseUrl || privacyPolicyUrl || origin) && (
        <p className={styles.note}>
          {(termsOfUseUrl || privacyPolicyUrl) && (
            <>
              按「授權」即表示您同意 {appName} 的
              {termsOfUseUrl && (
                <a href={termsOfUseUrl} target="_blank" rel="noreferrer">
                  服務條款
                </a>
              )}
              {termsOfUseUrl && privacyPolicyUrl && '與'}
              {privacyPolicyUrl && (
                <a href={privacyPolicyUrl} target="_blank" rel="noreferrer">
                  隱私權政策
                </a>
              )}
              。
            </>
          )}
          {origin && `授權後會回到 ${origin}。`}
        </p>
      )}
    </RegisterCard>
  )
}
