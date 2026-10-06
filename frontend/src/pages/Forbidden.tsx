import { Button, Result } from 'antd'
import { Link } from 'react-router'
import { PATHS } from '../routes/paths'

// 權限不足（例如一般會員進入會員審核）。設計稿未畫，先用 Ant Design Result。TODO(#12)：確認文案與樣式
export default function Forbidden() {
  return (
    <Result
      status="403"
      title="403"
      subTitle="您沒有權限瀏覽這個頁面"
      extra={
        <Link to={PATHS.home}>
          <Button type="primary">回首頁</Button>
        </Link>
      }
    />
  )
}
