import type { ReactNode } from 'react'
import { Button, Grid } from 'antd'
import styles from './ActionBar.module.css'

// 底部操作列（docs/design/receipt/README.md「表單初始」）
// 桌機（≥ lg）：內容區底部白底列、上方分隔線，「取消」（次要）＋「確認」（主要）置中
// 手機（< lg）：兩顆按鈕各半寬，左「返回」右「確認」，底部預留 safe area
//
// TODO(#12)：web「取消／確認」與 mob「返回／送出（稿中為確認）」文字是否統一未定，
// 先依稿預設，並開放 cancelText / confirmText（桌機）與 mobileCancelText / mobileConfirmText（手機）覆寫。
// TODO(#12)：按鈕樣式（黑底膠囊）由 #2 Button 元件／theme 處理，這裡只用 AntD Button 的 variant。

export interface ActionBarProps {
  onCancel?: () => void
  onConfirm?: () => void
  /** 桌機左按鈕文字，預設「取消」 */
  cancelText?: ReactNode
  /** 桌機右按鈕文字，預設「確認」 */
  confirmText?: ReactNode
  /** 手機左按鈕文字，預設「返回」 */
  mobileCancelText?: ReactNode
  /** 手機右按鈕文字，預設與 confirmText 相同 */
  mobileConfirmText?: ReactNode
  confirmDisabled?: boolean
  confirmLoading?: boolean
  /** 不顯示左按鈕（例如只有單一確認動作的頁面） */
  hideCancel?: boolean
  /** 確認鈕設為 submit，搭配外層 <Form> 使用 */
  confirmHtmlType?: 'button' | 'submit'
  className?: string
}

export default function ActionBar({
  onCancel,
  onConfirm,
  cancelText = '取消',
  confirmText = '確認',
  mobileCancelText = '返回',
  mobileConfirmText,
  confirmDisabled,
  confirmLoading,
  hideCancel,
  confirmHtmlType = 'button',
  className,
}: ActionBarProps) {
  const screens = Grid.useBreakpoint()
  const isDesktop = !!screens.lg

  return (
    <div className={[styles.bar, className].filter(Boolean).join(' ')} role="group" aria-label="操作">
      <div className={styles.inner}>
        {!hideCancel && (
          <Button
            className={styles.button}
            shape="round"
            color="default"
            variant="outlined"
            onClick={onCancel}
          >
            {isDesktop ? cancelText : mobileCancelText}
          </Button>
        )}
        <Button
          className={styles.button}
          shape="round"
          color="default"
          variant="solid"
          htmlType={confirmHtmlType}
          disabled={confirmDisabled}
          loading={confirmLoading}
          onClick={onConfirm}
        >
          {isDesktop ? confirmText : (mobileConfirmText ?? confirmText)}
        </Button>
      </div>
    </div>
  )
}
