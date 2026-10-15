import { Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { getApiErrorMessage, isApiError } from '../../api/client'
import { createReceiptFileUrl, getReceiptDownload } from '../../api/receipt'
import type { ReceiptDownloadInfo } from '../../api/types'
import ActionBar from '../../components/ActionBar'
import { FormCard } from '../../components/form'
import Icon from '../../components/Icon'
import { useNotifyModal } from '../../components/NoticeModal'
import ResultPage from '../../components/ResultPage'
import { PATHS } from '../../routes/paths'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import { downloadFromUrl } from '../../utils/download'
import { hasInAppHistory } from '../../utils/history'
import { formatTime, passwordHint } from './receiptMessages'
import styles from './ReceiptDownload.module.css'

// 奉獻收據下載頁（#50，2026-10-15 決定）：只有手機的會員（或選擇手機的人）收到的簡訊裡放這頁的網址
// - 放在需登入的路由下（未登入 → 登入頁，登入後導回這頁）；只有收據本人能下載
// - 連結寄出後 1 小時內有效，期間可重複開啟（例如第一次下載失敗）
// - 按「下載」時才向後端要一個即時產生、5 分鐘內有效的檔案網址，不寫進網址列或畫面
//
// TODO(#12)：設計稿沒有下載頁、過期與錯誤畫面，照奉獻收據頁與結果頁的風格做；文案為推測

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; info: ReceiptDownloadInfo }
  | { status: 'expired' | 'forbidden' | 'notFound' | 'error' }

const MESSAGES = {
  title: '奉獻收據下載',
  receiptName: (year: number) => `${year} 年度奉獻收據`,
  validUntil: (time: string) => `下載連結 ${time} 前有效，期間可重複下載。`,
  download: '下載',
  downloadFailedTitle: '下載失敗',
  failed: '發生錯誤，請稍後再試',
  expiredTitle: '連結已過期，請重新申請',
  expiredContent: '下載連結在寄出後 1 小時內有效。',
  backToReceipt: '回奉獻收據',
  forbiddenTitle: '無法下載這份收據',
  forbiddenContent: '這個下載連結不屬於目前登入的帳號，請確認登入的帳號是否正確。',
  notFoundTitle: '找不到這份收據',
  notFoundContent: '連結可能有誤，請確認網址或重新申請。',
  errorTitle: '載入失敗',
  errorContent: '請稍後再試',
  reload: '重新載入',
  backHome: '回首頁',
} as const

/** API 錯誤 → 畫面狀態；UNAUTHORIZED 由 client 統一導回登入頁，回 null 維持原狀 */
function toErrorState(error: unknown): LoadState | null {
  if (isApiError(error, 'UNAUTHORIZED')) return null
  if (isApiError(error, 'LINK_EXPIRED')) return { status: 'expired' }
  if (isApiError(error, 'FORBIDDEN')) return { status: 'forbidden' }
  if (isApiError(error, 'RECEIPT_NOT_FOUND')) return { status: 'notFound' }
  return { status: 'error' }
}

export default function ReceiptLinkDownload() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [reloadCount, setReloadCount] = useState(0)
  // 結果以 key 記錄對應的 id 與重新載入次數，換 id 或重新載入時舊結果自動失效（回到 loading）
  const key = `${id}#${reloadCount}`
  const [loaded, setLoaded] = useState<{ key: string; state: LoadState } | null>(null)
  const [downloading, setDownloading] = useState(false)
  const { notify, contextHolder } = useNotifyModal()

  useEffect(() => {
    let cancelled = false
    getReceiptDownload(id)
      .then((info) => !cancelled && setLoaded({ key, state: { status: 'ready', info } }))
      .catch((error: unknown) => {
        const state = toErrorState(error)
        if (!cancelled && state) setLoaded({ key, state })
      })
    return () => {
      cancelled = true
    }
  }, [id, key])

  const state: LoadState = loaded?.key === key ? loaded.state : { status: 'loading' }

  const goHome = () => navigate(PATHS.home, { replace: true })
  const goReceipt = () => navigate(PATHS.receipt)
  const handleCancel = () => {
    if (hasInAppHistory()) navigate(-1)
    else goHome()
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const file = await createReceiptFileUrl(id)
      downloadFromUrl(file.url, file.fileName)
    } catch (error) {
      const next = toErrorState(error)
      // 開著頁面超過 1 小時才按、或其他人的連結：直接切到對應畫面
      if (next && next.status !== 'error') setLoaded({ key, state: next })
      else if (next)
        void notify({ title: MESSAGES.downloadFailedTitle, content: getApiErrorMessage(error, MESSAGES.failed) })
    } finally {
      setDownloading(false)
    }
  }

  if (state.status === 'expired') {
    return (
      <ResultPage
        status="warning"
        title={MESSAGES.expiredTitle}
        description={MESSAGES.expiredContent}
        backText={MESSAGES.backToReceipt}
        onBack={goReceipt}
      />
    )
  }
  if (state.status === 'forbidden') {
    return (
      <ResultPage
        status="error"
        title={MESSAGES.forbiddenTitle}
        description={MESSAGES.forbiddenContent}
        backText={MESSAGES.backHome}
        onBack={goHome}
      />
    )
  }
  if (state.status === 'notFound') {
    return (
      <ResultPage
        status="error"
        title={MESSAGES.notFoundTitle}
        description={MESSAGES.notFoundContent}
        backText={MESSAGES.backToReceipt}
        onBack={goReceipt}
      />
    )
  }
  if (state.status === 'error') {
    return (
      <ResultPage
        status="error"
        title={MESSAGES.errorTitle}
        description={MESSAGES.errorContent}
        backText={MESSAGES.reload}
        onBack={() => setReloadCount((count) => count + 1)}
      />
    )
  }

  return (
    <div className={styles.page}>
      {contextHolder}
      <div className={styles.body}>
        <h1 className={cx(typography.pageTitle, styles.title)}>{MESSAGES.title}</h1>
        <FormCard className={styles.card}>
          {state.status === 'ready' ? (
            <>
              <p className={styles.contact}>
                <Icon name="file-earmark-pdf" className={styles.contactIcon} />
                <span className={styles.destination}>{MESSAGES.receiptName(state.info.year)}</span>
              </p>
              <p className={styles.description}>{MESSAGES.validUntil(formatTime(state.info.expiresAt))}</p>
              <p className={cx(styles.description, styles.lastText)}>{passwordHint(state.info.passwordRule)}</p>
            </>
          ) : (
            <Skeleton active title={false} paragraph={{ rows: 3 }} aria-busy="true" aria-label="載入中" />
          )}
        </FormCard>
      </div>
      <ActionBar
        bleed
        onCancel={handleCancel}
        onConfirm={() => void handleDownload()}
        confirmText={MESSAGES.download}
        confirmDisabled={state.status !== 'ready'}
        confirmLoading={downloading}
      />
    </div>
  )
}
