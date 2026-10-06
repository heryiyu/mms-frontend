import { Button, Result } from 'antd'
import { Link } from 'react-router'
import { PATHS } from '../routes/paths'

export default function NotFound() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="找不到這個頁面"
      extra={
        <Link to={PATHS.home}>
          <Button type="primary">回首頁</Button>
        </Link>
      }
    />
  )
}
