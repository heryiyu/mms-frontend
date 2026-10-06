import type { ReactNode } from 'react'
import { Grid } from 'antd'
import { cx } from '../../utils/cx'
import { Button } from '../Button'
import styles from './ActionBar.module.css'

// 底部操作列（docs/design/receipt/README.md「表單初始」）
// 桌機（≥ lg）：內容區底部白底列、上方分隔線，「取消」（次要）＋「確認」（主要）置中
// 手機（< lg）：兩顆按鈕各半寬，左「返回」右「確認」，底部預留 safe area
//
// TODO(#12)：web「取消／確認」與 mob「返回／送出（稿中為確認）」文字是否統一未定，
// 先依稿預設，並開放 cancelText / confirmText（桌機）與 mobileCancelText / mobileConfirmText（手機）覆寫。

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
  /**
   * true：固定在視窗底部、滿版（未登入全寬表單，GuestLayout full 變體）；
   * false（預設）：sticky 在捲動容器底部（登入後內容區）
   */
  fixed?: boolean
  /**
   * true：登入後內容頁底部用。推到內容區底部（父層需為 flex column），
   * 並以負 margin 抵銷內容區左右／下內距，貼齊內容區邊緣（修改密碼、會員審核）
   */
  bleed?: boolean
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
  fixed,
  bleed,
  className,
}: ActionBarProps) {
  const screens = Grid.useBreakpoint()
  const isDesktop = !!screens.lg

  return (
    <div className={cx(styles.bar, fixed && styles.fixed, bleed && styles.bleed, className)} role="group" aria-label="操作">
      <div className={styles.inner}>
        {!hideCancel && (
          <Button
            className={styles.button}
            variant="secondary"
            onClick={onCancel}
          >
            {isDesktop ? cancelText : mobileCancelText}
          </Button>
        )}
        <Button
          className={styles.button}
          variant="primary"
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
