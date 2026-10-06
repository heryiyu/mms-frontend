import { Typography } from 'antd'
import GuestBrandHeader from '../layouts/GuestBrandHeader'

// 未登入頁面的暫時佔位，待登入／註冊／忘記密碼各自的 issue 實作後替換
export default function GuestPlaceholder({ title, brand = false }: { title: string; brand?: boolean }) {
  return (
    <>
      {brand && <GuestBrandHeader />}
      <Typography.Title level={5}>{title}</Typography.Title>
      <Typography.Text type="secondary">頁面施工中</Typography.Text>
    </>
  )
}
