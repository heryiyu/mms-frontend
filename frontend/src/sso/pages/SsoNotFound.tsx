import ResultPage from '../../components/ResultPage'
import { MEMBER_CENTER_LOGIN_URL } from '../paths'

/** 找不到頁面、或流程中斷的錯誤頁（設計稿未畫，沿用結果頁的失敗樣式） */
export default function SsoNotFound({ title = '找不到這個頁面' }: { title?: string }) {
  return (
    <ResultPage
      fullPage
      status="error"
      title={title}
      description="請回到會員中心重新登入"
      backText="回到會員中心"
      onBack={() => window.location.assign(MEMBER_CENTER_LOGIN_URL)}
    />
  )
}
