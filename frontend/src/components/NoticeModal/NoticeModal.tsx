import { Button, Modal } from 'antd'
import type { ReactNode } from 'react'
import { layout } from '../../theme/tokens'
import Icon from '../Icon'
import styles from './NoticeModal.module.css'

// 通知彈窗（docs/design/components/README.md「pop-up說明」）
// 標題＋內容＋「確認」按鈕＋右上 ✕；桌機寬 480px、手機寬 90%，置中、高度依內容。
// Esc 關閉與焦點鎖定由 AntD Modal（rc-dialog）內建處理。
export interface NoticeModalProps {
  open: boolean
  title: ReactNode
  content?: ReactNode
  /** 確認按鈕文字，預設「確認」 */
  okText?: ReactNode
  /**
   * 有值時顯示雙按鈕（取消／確認）變體，例：會員審核的退回確認。
   * TODO(#12): 設計稿只畫了單按鈕，雙按鈕版樣式（排列、文字「取消」或「返回」）待設計確認，
   * 暫定左 Outline「取消」、右 Solid「確認」，並排置中。
   */
  cancelText?: ReactNode
  /** 確認按鈕載入中（例：送出退回時） */
  confirmLoading?: boolean
  onOk?: () => void
  /** 按 ✕、Esc、遮罩或「取消」時呼叫 */
  onCancel?: () => void
  /** 關閉動畫結束後呼叫 */
  afterClose?: () => void
}

export default function NoticeModal({
  open,
  title,
  content,
  okText = '確認',
  cancelText,
  confirmLoading,
  onOk,
  onCancel,
  afterClose,
}: NoticeModalProps) {
  const footer = (
    <div className={styles.footer}>
      {cancelText != null && (
        <Button shape="round" color="default" variant="outlined" className={styles.button} onClick={onCancel}>
          {cancelText}
        </Button>
      )}
      <Button
        shape="round"
        color="default"
        variant="solid"
        className={styles.button}
        loading={confirmLoading}
        onClick={onOk}
        autoFocus
      >
        {okText}
      </Button>
    </div>
  )

  return (
    <Modal
      open={open}
      centered
      // mobile-first：手機 90%，md 以上固定 480px
      width={{ xs: '90%', md: layout.modalWidth }}
      title={title}
      footer={footer}
      closable={{ 'aria-label': '關閉' }}
      closeIcon={<Icon name="x-lg" />}
      keyboard
      // TODO(#12): 點遮罩是否可關閉設計稿未註記，暫定可關閉（與 ✕ 同效果）
      mask={{ closable: true }}
      // 焦點鎖在彈窗內（驗收條件），關閉後焦點回到觸發元素
      focusable={{ trap: true, focusTriggerAfterClose: true }}
      onCancel={onCancel}
      afterClose={afterClose}
      destroyOnHidden
      rootClassName={styles.root}
    >
      {content != null && <div className={styles.content}>{content}</div>}
    </Modal>
  )
}
