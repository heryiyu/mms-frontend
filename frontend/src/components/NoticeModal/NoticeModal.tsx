import { Modal } from 'antd'
import type { ReactNode } from 'react'
import { layout } from '../../theme/tokens'
import { Button } from '../Button'
import Icon from '../Icon'
import { cx } from '../../utils/cx'
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
   * 樣式依 docs/design/member-review/{web,mob}/會員審核/退回機制.png：左 Outline「取消」、右 Solid「確認」，
   * 兩顆等寬並排置中。
   */
  cancelText?: ReactNode
  /** 確認按鈕載入中（例：送出退回時） */
  confirmLoading?: boolean
  /** 確認按鈕停用（例：退回原因還沒填） */
  confirmDisabled?: boolean
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
  confirmDisabled,
  onOk,
  onCancel,
  afterClose,
}: NoticeModalProps) {
  const footer = (
    <div className={cx(styles.footer, cancelText != null && styles.dual)}>
      {cancelText != null && (
        <Button variant="secondary" className={styles.button} onClick={onCancel}>
          {cancelText}
        </Button>
      )}
      <Button
        variant="primary"
        className={styles.button}
        loading={confirmLoading}
        disabled={confirmDisabled}
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
      // 點遮罩可關閉（與 ✕ 同效果），已確認（#12） C2(b)
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
