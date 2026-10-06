import { Result, type ResultProps } from 'antd'
import { useNavigate } from 'react-router'
import { Button } from '../components/Button'
import { PATHS } from '../routes/paths'

// 403／404 共用：AntD Result + 「回首頁」。設計稿未畫，TODO(#12)：確認文案與樣式
export default function HomeLinkResult(props: Pick<ResultProps, 'status' | 'title' | 'subTitle'>) {
  const navigate = useNavigate()
  return <Result {...props} extra={<Button onClick={() => navigate(PATHS.home)}>回首頁</Button>} />
}
