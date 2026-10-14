import { useEffect } from 'react'
import PageLoading from '../../components/PageLoading'
import { PATHS } from '../../routes/paths'
import { memberCenterUrl } from '../paths'

/**
 * 沒有進行中的登入（直接開 SSO 網址、/unknown-session）：轉到會員中心登入頁，由會員中心重新發起登入。
 * 和 Logto 目前的 unknownSessionRedirectUrl 行為一致。
 */
export default function ToMemberCenter() {
  useEffect(() => {
    window.location.replace(memberCenterUrl(PATHS.login))
  }, [])
  return <PageLoading />
}
