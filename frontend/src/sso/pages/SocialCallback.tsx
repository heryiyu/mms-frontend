import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import ResultPage, { type ResultPageProps } from '../../components/ResultPage'
import { LoginLoading } from '../../components/LoginView'
import { PATHS } from '../../routes/paths'
import { isExperienceError } from '../api/client'
import { getExperienceErrorMessage } from '../api/errors'
import { goToRedirect } from '../api/experience'
import { memberCenterUrl, SSO_PATHS } from '../paths'
import { completeSocialSignIn, getMissingProfile, socialProviderName } from '../social'

interface Failure {
  status: NonNullable<ResultPageProps['status']>
  title: string
  description: string
  backText: string
  onBack: () => void
}

/**
 * 社群平台授權完成的導回頁（/callback/:connectorId，#58）。設計稿未畫：處理中沿用會員中心 Line 導回頁的 Logo 遮罩，
 * 失敗沿用結果頁（失敗／警告樣式）。流程在 src/sso/social.ts 的 completeSocialSignIn。
 */
export default function SocialCallback() {
  const { connectorId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [failure, setFailure] = useState<Failure | null>(null)
  // StrictMode 會執行兩次 effect；授權碼只能換一次
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const name = socialProviderName(connectorId)
    const backToSignIn = { backText: '重新登入', onBack: () => navigate(SSO_PATHS.signIn, { replace: true }) }

    completeSocialSignIn(connectorId, params)
      .then(goToRedirect)
      .catch((error: unknown) => {
        if (isExperienceError(error, 'session.not_found')) {
          // 登入逾時（沒有進行中的 interaction）：要從原網站重新發起登入
          setFailure({
            status: 'error',
            title: `${name}登入失敗`,
            description: getExperienceErrorMessage(error),
            backText: '回到會員中心',
            onBack: () => window.location.assign(memberCenterUrl(PATHS.login)),
          })
          return
        }
        if (isExperienceError(error, 'user.missing_profile')) {
          // TODO(#58)：社群帳號沒有 email／手機時，要讓使用者補填並驗證（sendVerificationCode → verifyCode →
          // addProfile({ type: 'email' | 'phone', verificationId }) → identify → submit）；目前只顯示提示
          const missing = getMissingProfile(error)
          const lacksContact = missing.some((field) => field === 'email' || field === 'phone' || field === 'emailOrPhone')
          setFailure({
            status: 'warning',
            title: `無法使用${name}註冊`,
            description: lacksContact
              ? `您的${name}帳號沒有提供電子信箱或手機號碼，請改用電子信箱或手機註冊。`
              : `使用${name}註冊需要補填帳號資料，請改用電子信箱或手機註冊。`,
            backText: '改用電子信箱或手機註冊',
            onBack: () => navigate(SSO_PATHS.register, { replace: true }),
          })
          return
        }
        setFailure({
          status: 'error',
          title: isExperienceError(error, 'social_cancelled') ? `已取消${name}登入` : `${name}登入失敗`,
          description: isExperienceError(error, 'social_cancelled')
            ? `您已取消${name}授權，可以重新登入或改用其他方式登入`
            : getExperienceErrorMessage(error, `${name}登入失敗，請重新操作`),
          ...backToSignIn,
        })
      })
  }, [connectorId, navigate, params])

  if (!failure) return <LoginLoading spinning />

  return (
    <ResultPage
      status={failure.status}
      title={failure.title}
      description={failure.description}
      backText={failure.backText}
      onBack={failure.onBack}
    />
  )
}
