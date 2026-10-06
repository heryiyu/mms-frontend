import { Card, Result, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { isApiError } from '../../api/client'
import { approveMembers, getPendingMembers } from '../../api/review'
import type { PendingMember } from '../../api/types'
import ActionBar from '../../components/ActionBar'
import { Button } from '../../components/Button'
import { Checkbox } from '../../components/form'
import Icon from '../../components/Icon'
import { useNotifyModal } from '../../components/NoticeModal'
import ResultPage from '../../components/ResultPage'
import { PATHS } from '../../routes/paths'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import ApplicantCard from './ApplicantCard'
import ReviewEmpty from './ReviewEmpty'
import styles from './MemberReview.module.css'

// 會員審核：申請列表與批次通過（issue #24，docs/design/member-review/README.md）
// 狀態流程：載入 → 待審核清單（未勾選時「確認」停用）→ 勾選後按「確認」只送出勾選的 id → 審核完成
// 權限：路由已包在 <RequireRole minRole="leader">（routes/index.tsx），一般會員直接輸入網址會被導到 403
//
// TODO(#12)：以下皆為設計未定、先依推測實作——
// - 部分勾選時「全部選取」不顯示半選（稿中為未勾），點擊後改為全選
// - 完成頁「返回」回到待審核清單（重新載入剩下的申請）；底部「取消／返回」回首頁
// - 審核通過不跳確認彈窗，直接送出
// - 批次通過時部分失敗（failedIds）在完成頁以說明文字提示筆數
// TODO(#25)：卡片「退回」的確認彈窗與「已退回！」完成頁另案實作

// TODO(#12)：錯誤與部分失敗的文案設計未定
const MESSAGES = {
  loadFailedTitle: '無法載入待審核清單',
  loadFailedContent: '請確認網路連線後重新載入。',
  reload: '重新載入',
  approveFailedTitle: '審核失敗',
  approveFailedContent: '發生錯誤，請稍後再試',
  allProcessed: '勾選的申請已被處理，請重新整理清單。',
  partialFailed: (n: number) => `有 ${n} 筆申請已被處理或不存在，未審核通過。`,
} as const

type LoadState = 'loading' | 'ready' | 'error'

export default function MemberReview() {
  const navigate = useNavigate()
  const { notify, contextHolder } = useNotifyModal()
  const [members, setMembers] = useState<PendingMember[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [submitting, setSubmitting] = useState(false)
  /** 審核完成；值為未能通過的筆數（部分失敗提示用） */
  const [done, setDone] = useState<{ failedCount: number } | null>(null)

  /** 每次 +1 觸發重新取得清單 */
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    getPendingMembers()
      .then((list) => {
        if (!active) return
        setMembers(list)
        // 只保留仍在清單中的勾選
        setSelected((prev) => new Set(list.filter((m) => prev.has(m.id)).map((m) => m.id)))
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (!active || isApiError(error, 'UNAUTHORIZED')) return // 401 由 client 統一導回登入頁
        setLoadState('error')
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  /** 重新載入（事件觸發）：先顯示載入中 */
  const reload = () => {
    setLoadState('loading')
    setReloadKey((key) => key + 1)
  }

  const goHome = () => navigate(PATHS.home)

  const allSelected = members.length > 0 && members.every((m) => selected.has(m.id))

  const handleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(members.map((m) => m.id)) : new Set())
  }

  const handleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleApprove = async () => {
    // 只送出勾選的資料（設計師註記「只送出勾選資料」）
    const ids = members.filter((m) => selected.has(m.id)).map((m) => m.id)
    if (ids.length === 0) return
    setSubmitting(true)
    try {
      const { approved, failedIds } = await approveMembers(ids)
      if (approved === 0) {
        void notify({ title: MESSAGES.approveFailedTitle, content: MESSAGES.allProcessed })
        reload()
        return
      }
      setSelected(new Set())
      setDone({ failedCount: failedIds.length })
    } catch (error) {
      if (isApiError(error, 'UNAUTHORIZED')) return
      const known = isApiError(error) && error.code !== 'UNKNOWN'
      void notify({ title: MESSAGES.approveFailedTitle, content: known ? error.message : MESSAGES.approveFailedContent })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResultBack = () => {
    setDone(null)
    reload()
  }

  if (done) {
    return (
      <ResultPage
        title="審核完成！"
        description={done.failedCount > 0 ? MESSAGES.partialFailed(done.failedCount) : undefined}
        onBack={handleResultBack}
      />
    )
  }

  const isEmpty = loadState === 'ready' && members.length === 0
  const showList = loadState === 'loading' || (loadState === 'ready' && members.length > 0)

  return (
    <div className={styles.page}>
      {contextHolder}
      <div className={styles.header}>
        <h1 className={cx(typography.pageTitle, styles.title)}>會員審核</h1>
        {showList && (
          <Checkbox
            className={styles.selectAll}
            checked={allSelected}
            disabled={loadState !== 'ready'}
            onChange={(e) => handleSelectAll(e.target.checked)}
          >
            全部選取
          </Checkbox>
        )}
      </div>

      {loadState === 'loading' && (
        <div className={styles.list} aria-busy="true" aria-label="載入中">
          <Card variant="borderless" className={styles.skeletonCard}>
            <Skeleton active title={false} paragraph={{ rows: 8 }} />
          </Card>
        </div>
      )}

      {loadState === 'error' && (
        <Card variant="borderless" className={styles.errorCard}>
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
        </Card>
      )}

      {isEmpty && <ReviewEmpty onBack={goHome} />}

      {loadState === 'ready' && members.length > 0 && (
        <ul className={styles.list} aria-label="待審核申請">
          {members.map((member) => (
            <li key={member.id}>
              <ApplicantCard member={member} checked={selected.has(member.id)} onCheckedChange={handleSelect} />
            </li>
          ))}
        </ul>
      )}

      {showList && (
        <ActionBar
          bleed
          onCancel={goHome}
          onConfirm={() => void handleApprove()}
          confirmDisabled={selected.size === 0}
          confirmLoading={submitting}
        />
      )}
    </div>
  )
}
