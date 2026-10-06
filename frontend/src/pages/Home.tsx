import { Badge, Card, Col, Row, theme } from 'antd'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getMe } from '../api/member'
import { getPendingCount } from '../api/review'
import { useAuth } from '../auth/useAuth'
import IconCircle from '../components/IconCircle'
import { getMemberQuickActions, type MemberQuickAction } from '../layouts/memberNav'
import { PATHS } from '../routes/paths'
import typography from '../styles/typography.module.css'
import { cx } from '../utils/cx'
import styles from './Home.module.css'

/** 橫幅顯示的稱呼：暱稱優先（註冊時暱稱可不填），沒有就用姓名 */
function useDisplayName(token: string | undefined): string {
  const [name, setName] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    getMe()
      .then((me) => !cancelled && setName(me.nickname || me.name))
      // 取不到資料時橫幅只顯示「Hi」，不擋住首頁其他功能
      .catch(() => !cancelled && setName(''))
    return () => {
      cancelled = true
    }
  }, [token])

  return name
}

/** 待審核人數（會員審核卡片徽章）；只有區長以上才會去抓，其餘一律 0 */
function usePendingReviewCount(token: string | undefined, enabled: boolean): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!token || !enabled) return
    let cancelled = false
    getPendingCount()
      .then((res) => !cancelled && setCount(res.count))
      .catch(() => !cancelled && setCount(0))
    return () => {
      cancelled = true
    }
  }, [token, enabled])

  return enabled ? count : 0
}

function QuickActionCard({ action, badgeCount = 0 }: { action: MemberQuickAction; badgeCount?: number }) {
  const ariaLabel = badgeCount > 0 ? `${action.label}，${badgeCount} 筆待審核` : undefined

  return (
    <Link to={action.path} className={styles.cardLink} aria-label={ariaLabel}>
      <Badge count={badgeCount} className={styles.badge}>
        <Card variant="borderless" hoverable className={styles.card} classNames={{ body: styles.cardBody }}>
          <IconCircle name={action.icon} />
          <span className={styles.cardLabel}>{action.label}</span>
        </Card>
      </Badge>
    </Link>
  )
}

/**
 * 會員中心首頁（docs/design/member-home/README.md「首頁預設」）
 * - 歡迎橫幅「Hi {暱稱}／歡迎回來」
 * - 「常見功能」卡片依角色過濾（layouts/memberNav.ts）：一般會員只有奉獻收據下載，區長以上多會員審核
 * - 會員審核卡片右上顯示未審核人數徽章（0 時不顯示）
 */
export default function Home() {
  const { session, role, can } = useAuth()
  const token = session?.token
  const displayName = useDisplayName(token)
  const pendingCount = usePendingReviewCount(token, can('leader'))
  const actions = getMemberQuickActions(role)
  const { token: designToken } = theme.useToken()
  const cardGap = designToken.margin // 卡片左右／上下間距 16px（web、mob 相同）

  return (
    <div className={styles.page}>
      <section className={styles.banner} aria-label="歡迎訊息">
        <h1 className={cx(typography.headline5, styles.greeting)}>Hi {displayName}</h1>
        <p className={styles.welcome}>歡迎回來</p>
      </section>

      <section className={styles.section} aria-labelledby="home-quick-actions">
        <h2 id="home-quick-actions" className={cx(typography.headline5, styles.sectionTitle)}>
          常見功能
        </h2>
        {/* TODO(#12)：設計稿只有兩張卡片，功能變多時每列幾張（web／mob）未定義，暫定一律兩欄 */}
        <Row gutter={[cardGap, cardGap]}>
          {actions.map((action) => (
            <Col key={action.path} span={12} className={styles.col}>
              <QuickActionCard
                action={action}
                badgeCount={action.path === PATHS.memberReview ? pendingCount : undefined}
              />
            </Col>
          ))}
        </Row>
      </section>
    </div>
  )
}
