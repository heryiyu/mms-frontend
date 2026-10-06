import { Card, ConfigProvider, Descriptions, type DescriptionsProps, type ThemeConfig } from 'antd'
import type { Gender, PendingMember } from '../../api/types'
import { Button } from '../../components/Button'
import { Checkbox } from '../../components/form'
import { colors } from '../../theme/tokens'
import styles from './ApplicantCard.module.css'

// 待審核申請者卡片（docs/design/member-review/README.md「待審核清單」）
// 頂列「選取」＋ checkbox；中段「標籤（gray3）— 值（gray1）」描述清單、列間分隔線；底部置中主色文字「退回」

const GENDER_LABEL: Record<Gender, string> = { male: '男', female: '女' }

// 描述清單：標籤 gray3、值 gray1，取消 AntD 每列下方的預設間距（列高與分隔線由 CSS 控制）
const descriptionsTheme: ThemeConfig = {
  components: {
    Descriptions: {
      labelColor: colors.gray3,
      contentColor: colors.gray1,
      itemPaddingBottom: 0,
      colonMarginRight: 0,
      colonMarginLeft: 0,
    },
  },
}

export interface ApplicantCardProps {
  member: PendingMember
  checked: boolean
  onCheckedChange: (id: string, checked: boolean) => void
  /** 卡片底部「退回」；TODO(#25)：退回流程（確認彈窗 → 已退回！）另案實作 */
  onReject?: (member: PendingMember) => void
}

export default function ApplicantCard({ member, checked, onCheckedChange, onReject }: ApplicantCardProps) {
  // TODO(#12)：EKK、靈程的意義與顯示格式待確認，先直接顯示名稱／代碼
  const items: DescriptionsProps['items'] = [
    { key: 'name', label: '姓名', children: member.name },
    { key: 'nickname', label: '暱稱', children: member.nickname },
    { key: 'gender', label: '性別', children: GENDER_LABEL[member.gender] },
    { key: 'email', label: '信箱', children: member.email },
    { key: 'phone', label: '手機', children: member.phone },
    { key: 'district', label: '牧區', children: member.district },
    { key: 'group', label: '小組', children: member.group },
    { key: 'ekk', label: 'EKK', children: member.ekk },
    { key: 'journey', label: '靈程', children: member.journey },
  ]

  return (
    <Card variant="borderless" className={styles.card} styles={{ body: { padding: 0 } }}>
      <Checkbox
        className={styles.select}
        checked={checked}
        aria-label={`選取 ${member.name}`}
        onChange={(e) => onCheckedChange(member.id, e.target.checked)}
      >
        選取
      </Checkbox>
      <ConfigProvider theme={descriptionsTheme}>
        <Descriptions className={styles.fields} column={1} colon={false} items={items} />
      </ConfigProvider>
      <div className={styles.footer}>
        <Button variant="text" onClick={onReject ? () => onReject(member) : undefined}>
          退回
        </Button>
      </div>
    </Card>
  )
}
