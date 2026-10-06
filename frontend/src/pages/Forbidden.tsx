import HomeLinkResult from './HomeLinkResult'

// 權限不足（例如一般會員進入會員審核）
export default function Forbidden() {
  return <HomeLinkResult status="403" title="403" subTitle="您沒有權限瀏覽這個頁面" />
}
