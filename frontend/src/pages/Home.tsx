import { Card, Col, Row, Typography } from 'antd'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import Icon from '../components/Icon'
import { getMemberQuickActions } from '../layouts/memberNav'

// 首頁佔位：「常見功能」卡片已依角色過濾（一般會員只有奉獻收據下載）；版面待首頁 issue 依 Figma 實作
export default function Home() {
  const { role } = useAuth()

  return (
    <>
      <Typography.Title level={3}>首頁</Typography.Title>
      <Typography.Title level={5}>常見功能</Typography.Title>
      <Row gutter={[16, 16]}>
        {getMemberQuickActions(role).map((action) => (
          <Col key={action.path} xs={12} lg={8}>
            <Link to={action.path}>
              <Card hoverable>
                <Icon name={action.icon} size={24} /> {action.label}
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </>
  )
}
