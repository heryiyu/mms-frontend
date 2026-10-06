import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { lineCallback } from '../../api/auth'
import { ApiError, isApiError } from '../../api/client'
import { PATHS } from '../../routes/paths'
import type { LoginPageState } from './Login'
import LoginLoading from './LoginLoading'

/**
 * Line OAuth 授權完成後的導回頁（設計未畫，只顯示 loading 遮罩）。
 * - LOGGED_IN：lineCallback() 寫入 auth store，GuestOnly 守衛自動導回首頁
 * - ACCOUNT_PENDING：等待審核頁
 * - REGISTER_REQUIRED：接註冊流程
 * - 其他錯誤：回登入頁並顯示通知彈窗
 *
 * TODO(#12)：
 * - state 參數應與發出授權前存下的值比對（防 CSRF），待後端定義 state 的產生方式
 * - 「記住帳號」在跳轉後無法帶回，Line 登入暫不記住
 * - REGISTER_REQUIRED 接回註冊流程的哪一步設計待確認，暫導向註冊頁並以 state 帶 lineToken
 */
export default function LineCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // StrictMode 會執行兩次 effect；code 只能換一次，避免重複呼叫
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const code = params.get('code')
    const state = params.get('state')
    // history state 會經過 structured clone，ApiError 的類別會遺失，只帶可序列化的欄位
    const backToLogin = (error: unknown) => {
      const apiError = isApiError(error) ? error : new ApiError(0, 'UNKNOWN', String(error))
      const lineError = { status: apiError.status, code: apiError.code, message: apiError.message }
      navigate(PATHS.login, { replace: true, state: { lineError } satisfies LoginPageState })
    }

    if (!code || !state) {
      backToLogin(new ApiError(400, 'TOKEN_INVALID', 'Line 登入失敗，請重新操作'))
      return
    }

    lineCallback({ code, state })
      .then((res) => {
        if (res.status === 'REGISTER_REQUIRED') {
          navigate(PATHS.register, { replace: true, state: { lineToken: res.lineToken } })
        }
        // LOGGED_IN：守衛自動導頁
      })
      .catch((error: unknown) => {
        if (isApiError(error, 'ACCOUNT_PENDING')) navigate(PATHS.pending, { replace: true })
        else backToLogin(error)
      })
  }, [navigate, params])

  return <LoginLoading spinning />
}
