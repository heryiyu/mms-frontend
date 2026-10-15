import { ConfigProvider, Descriptions, Grid, Result, Skeleton, type DescriptionsProps, type ThemeConfig } from 'antd'
import { useNavigate } from 'react-router'
import type { Gender, Me } from '../../api/types'
import { useMe } from '../../auth/useMe'
import ActionBar from '../../components/ActionBar'
import { Button } from '../../components/Button'
import { FormCard } from '../../components/form'
import Icon from '../../components/Icon'
import { PATHS } from '../../routes/paths'
import { colors } from '../../theme/tokens'
import { hasInAppHistory } from '../../utils/history'
import ProfileHeader from './ProfileHeader'
import styles from './Profile.module.css'

// 個人資訊檢視（issue #21，docs/design/profile/README.md「個人資訊檢視」menberinf）
// 標題列（右上「編輯資料」→ 修改頁）＋唯讀描述清單卡片（label gray3／值 gray1、列間分隔線）
//
// TODO(#12)：以下皆為設計未定、先依稿／推測實作——
// - web 底部依稿為「取消＋確認（停用）」，唯讀頁出現確認鈕不合理；mob 為單一「返回」。先照稿，取消／返回皆回上一頁
// - EKK、靈程的意義與顯示格式待確認，先直接顯示名稱／代碼（範例 Hooo、XN）
// - 身分證字號遮罩規則待確認（見 maskIdNumber）；手機是否遮罩待確認（修改頁需帶入原值，先顯示完整號碼）
// - email、手機可能只有其中一個（#49，以 SSO 為準）：沒有的顯示「－」，可在修改頁新增

const GENDER_LABEL: Record<Gender, string> = { male: '男', female: '女' }

const MESSAGES = {
  loadFailedTitle: '資料載入失敗',
  loadFailedContent: '請稍後再試',
  reload: '重新載入',
} as const

/**
 * 身分證字號遮罩：後端 /me 已回傳遮罩值（例 Q12*****89），已含 * 時原樣顯示；
 * 萬一拿到明碼，前端保留前 3 碼與後 2 碼、中間以 * 遮住。TODO(#12)：遮罩規則（稿上為 QXXXXXXXXX）待確認
 */
function maskIdNumber(value: string): string {
  if (!value || value.includes('*') || value.length <= 5) return value
  return `${value.slice(0, 3)}${'*'.repeat(value.length - 5)}${value.slice(-2)}`
}

const EMPTY = '－'

function toItems(me: Me): DescriptionsProps['items'] {
  return [
    { key: 'name', label: '姓名', children: me.name },
    { key: 'nickname', label: '暱稱', children: me.nickname || EMPTY },
    { key: 'gender', label: '性別', children: GENDER_LABEL[me.gender] ?? EMPTY },
    { key: 'idNumber', label: '身分證字號', children: maskIdNumber(me.idNumber) },
    { key: 'email', label: '信箱', children: me.email || EMPTY },
    { key: 'phone', label: '手機', children: me.phone || EMPTY },
    { key: 'church', label: '教會', children: me.church || EMPTY },
    { key: 'district', label: '牧區', children: me.district || EMPTY },
    { key: 'group', label: '小組', children: me.group || EMPTY },
    { key: 'ekk', label: 'EKK', children: me.ekk || EMPTY },
    { key: 'journey', label: '靈程', children: me.journey || EMPTY },
  ]
}

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

export default function Profile() {
  const navigate = useNavigate()
  const isDesktop = !!Grid.useBreakpoint().lg
  const { me, loadState, reload } = useMe()

  // 有站內上一頁就回上一頁，直接開啟此頁時回首頁
  const handleBack = () => {
    if (hasInAppHistory()) navigate(-1)
    else navigate(PATHS.home, { replace: true })
  }

  return (
    <div className={styles.page}>
      <ProfileHeader showEdit={loadState === 'ready'} />

      {loadState === 'loading' && (
        <FormCard className={styles.card} aria-busy="true" aria-label="載入中">
          <Skeleton active title={false} paragraph={{ rows: 8 }} className={styles.skeleton} />
        </FormCard>
      )}

      {loadState === 'error' && (
        <FormCard className={styles.card}>
          <Result
            icon={<Icon name="exclamation-circle" className={styles.errorIcon} />}
            title={MESSAGES.loadFailedTitle}
            subTitle={MESSAGES.loadFailedContent}
            extra={
              <Button variant="secondary" onClick={reload}>
                {MESSAGES.reload}
              </Button>
            }
          />
        </FormCard>
      )}

      {loadState === 'ready' && me && (
        <FormCard className={styles.card}>
          <ConfigProvider theme={descriptionsTheme}>
            <Descriptions className={styles.fields} column={1} colon={false} items={toItems(me)} />
          </ConfigProvider>
        </FormCard>
      )}

      {/* web：取消＋確認（停用）；mob：單一滿版「返回」（主要按鈕） */}
      <ActionBar
        bleed
        hideCancel={!isDesktop}
        onCancel={handleBack}
        onConfirm={isDesktop ? undefined : handleBack}
        confirmDisabled={isDesktop}
        mobileConfirmText="返回"
      />
    </div>
  )
}
