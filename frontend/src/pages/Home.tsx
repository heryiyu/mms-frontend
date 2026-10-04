import { Card, Col, Row, Typography } from 'antd'
import Icon from '../components/Icon'

export default function Home() {
  return (
    <>
      <Typography.Title level={3}>首頁</Typography.Title>
      <Row gutter={[16, 16]}>
        {['person-circle', 'gift', 'bell'].map((name) => (
          <Col key={name} xs={24} sm={12} lg={8}>
            <Card>
              <Icon name={name} size={24} /> 待依 Figma 設計實作
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )
}
