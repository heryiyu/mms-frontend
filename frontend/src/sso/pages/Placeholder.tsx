import { Typography } from 'antd'

/** 骨架階段的佔位頁，各頁做好後移除（#47 子 issue） */
export default function Placeholder({ title }: { title: string }) {
  return (
    <>
      <Typography.Title level={4}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">建置中（#47）</Typography.Paragraph>
    </>
  )
}
