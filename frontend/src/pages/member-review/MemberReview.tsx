import { Card, Input, Result, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { getApiErrorMessage, isApiError } from '../../api/client'
import { approveMembers, getPendingMembers, rejectMember } from '../../api/review'
import type { PendingMember } from '../../api/types'
import ActionBar from '../../components/ActionBar'
import { Button } from '../../components/Button'
import { Checkbox } from '../../components/form'
import Icon from '../../components/Icon'
import { NoticeModal, useNotifyModal } from '../../components/NoticeModal'
import ResultPage from '../../components/ResultPage'
import { PATHS } from '../../routes/paths'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import ApplicantCard from './ApplicantCard'
import ReviewEmpty from './ReviewEmpty'
import styles from './MemberReview.module.css'

// 會員審核：申請列表與批次通過（issue #24）、單筆退回（issue #25），docs/design/member-review/README.md
// 狀態流程：載入 → 待審核清單（未勾選時「確認」停用）→ 勾選後按「確認」只送出勾選的 id → 審核完成
// 退回：卡片「退回」→ 確認彈窗「注意／確定要退回此筆會員申請嗎？」→「確認」→ 已退回！
// 權限：路由已包在 <RequireRole minRole="leader">（routes/index.tsx），一般會員直接輸入網址會被導到 403
//
// 已確認（#12）：
// - R1 部分勾選時「全部選取」顯示半選（AntD indeterminate），點擊後改為全選
// - R2 審核通過不跳確認彈窗，直接送出
// - R3 批次通過時部分失敗（failedIds）在完成頁列出未通過的申請者姓名
// TODO(#12)：以下仍為推測——
// - 完成頁「返回」回到待審核清單（重新載入剩下的申請）；底部「取消／返回」回首頁
// - 退回只針對該筆、與勾選無關；其他已勾選的項目保留勾選（待確認 2）
// - 退回完成頁「返回」比照審核完成：回待審核清單並重新載入
// - 通知申請者、批次退回：設計稿未畫，不實作（待確認 1、2）
// 退回原因（#48，架構整理 D10 決定要填）：設計稿的退回確認彈窗沒有輸入欄位，先在內文下方加必填的多行輸入框，
// 原因會顯示給申請者（重新送出頁）並附在退回通知；樣式待設計確認。

// 已確認（#12） R3：空狀態與載入失敗維持目前文案
const MESSAGES = {
  loadFailedTitle: '無法載入待審核清單',
  loadFailedContent: '請確認網路連線後重新載入。',
  reload: '重新載入',
  approveFailedTitle: '審核失敗',
  approveFailedContent: '發生錯誤，請稍後再試',
  allProcessed: '勾選的申請已被處理，請重新整理清單。',
  partialFailed: (names: string[]) => `以下 ${names.length} 筆申請已被處理或不存在，未審核通過：${names.join('、')}`,
  rejectFailedTitle: '退回失敗',
  rejectFailedContent: '發生錯誤，請稍後再試',
  rejectProcessed: '此筆申請已被處理，清單將重新載入。',
} as const

// 退回確認彈窗文案（退回機制.png）；退回原因欄位設計稿未畫
const REJECT_CONFIRM = {
  title: '注意',
  content: '確定要退回此筆會員申請嗎？',
  cancelText: '取消',
  reasonLabel: '退回原因',
  reasonPlaceholder: '請輸入退回原因，會通知申請者',
} as const

const REJECT_REASON_MAX_LENGTH = 200

type LoadState = 'loading' | 'ready' | 'error'

/** 完成頁：審核完成（附未能通過的申請者姓名，部分失敗提示用）或已退回 */
type DoneState = { kind: 'approved'; failedNames: string[] } | { kind: 'rejected' }

export default function MemberReview() {
  const navigate = useNavigate()
  const { notify, contextHolder } = useNotifyModal()
  const [members, setMembers] = useState<PendingMember[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<DoneState | null>(null)
  /** 退回確認彈窗對象；null 為關閉 */
  const [rejectTarget, setRejectTarget] = useState<PendingMember | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

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
  const someSelected = !allSelected && members.some((m) => selected.has(m.id))

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
      const failed = new Set(failedIds)
      setDone({ kind: 'approved', failedNames: members.filter((m) => failed.has(m.id)).map((m) => m.name) })
    } catch (error) {
      if (isApiError(error, 'UNAUTHORIZED')) return
      void notify({ title: MESSAGES.approveFailedTitle, content: getApiErrorMessage(error, MESSAGES.approveFailedContent) })
    } finally {
      setSubmitting(false)
    }
  }

  const openRejectConfirm = (member: PendingMember) => {
    if (submitting) return
    setRejectReason('')
    setRejectTarget(member)
  }

  const closeRejectConfirm = () => {
    if (rejecting) return // 送出中不允許關閉，避免結果回來時畫面已不一致
    setRejectTarget(null)
  }

  const handleReject = async () => {
    const reason = rejectReason.trim()
    if (!rejectTarget || !reason) return
    const { id } = rejectTarget
    setRejecting(true)
    try {
      await rejectMember(id, reason)
      setRejectTarget(null)
      // 只移除被退回的這筆勾選，其他勾選保留（TODO(#12) 待確認 2）
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setDone({ kind: 'rejected' })
    } catch (error) {
      setRejectTarget(null)
      if (isApiError(error, 'UNAUTHORIZED')) return
      if (isApiError(error, 'ALREADY_PROCESSED') || isApiError(error, 'MEMBER_NOT_FOUND')) {
        // 已被其他人審核／退回：提示後重新載入清單
        void notify({ title: MESSAGES.rejectFailedTitle, content: MESSAGES.rejectProcessed })
        reload()
        return
      }
      void notify({ title: MESSAGES.rejectFailedTitle, content: getApiErrorMessage(error, MESSAGES.rejectFailedContent) })
    } finally {
      setRejecting(false)
    }
  }

  const handleResultBack = () => {
    setDone(null)
    reload()
  }

  if (done?.kind === 'approved') {
    return (
      <ResultPage
        title="審核完成！"
        description={done.failedNames.length > 0 ? MESSAGES.partialFailed(done.failedNames) : undefined}
        onBack={handleResultBack}
      />
    )
  }

  if (done?.kind === 'rejected') {
    return <ResultPage title="已退回！" onBack={handleResultBack} />
  }

  const isEmpty = loadState === 'ready' && members.length === 0
  const showList = loadState === 'loading' || (loadState === 'ready' && members.length > 0)

  return (
    <div className={styles.page}>
      {contextHolder}
      <NoticeModal
        open={rejectTarget != null}
        title={REJECT_CONFIRM.title}
        content={
          <>
            {REJECT_CONFIRM.content}
            <Input.TextArea
              className={styles.rejectReason}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={REJECT_CONFIRM.reasonPlaceholder}
              aria-label={REJECT_CONFIRM.reasonLabel}
              maxLength={REJECT_REASON_MAX_LENGTH}
              showCount
              autoSize={{ minRows: 3, maxRows: 6 }}
              disabled={rejecting}
              autoFocus
            />
          </>
        }
        cancelText={REJECT_CONFIRM.cancelText}
        confirmLoading={rejecting}
        confirmDisabled={!rejectReason.trim()}
        onOk={() => void handleReject()}
        onCancel={closeRejectConfirm}
      />
      <div className={styles.header}>
        <h1 className={cx(typography.pageTitle, styles.title)}>會員審核</h1>
        {showList && (
          <Checkbox
            className={styles.selectAll}
            checked={allSelected}
            indeterminate={someSelected}
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
              <ApplicantCard
                member={member}
                checked={selected.has(member.id)}
                onCheckedChange={handleSelect}
                onReject={openRejectConfirm}
              />
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
