import { Typography } from 'antd'

// 登入後頁面的暫時佔位，待各功能 issue 實作後在 routes/index.tsx 換成正式頁面
export default function MemberPlaceholder({ title }: { title: string }) {
  return (
    <>
      <Typography.Title level={3}>{title}</Typography.Title>
      <Typography.Text type="secondary">頁面施工中</Typography.Text>
    </>
  )
}
