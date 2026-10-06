import { Checkbox } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import styles from './ScrollAgreement.module.css'

// 捲動判定容許誤差（px）：縮放、子像素捲動時 scrollTop 可能差 1px 永遠到不了底
const BOTTOM_TOLERANCE = 2

export interface ScrollAgreementProps {
  /** 合約內文，放在固定高度的捲動區內 */
  children: ReactNode
  /** 同意 Checkbox 的文字 */
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  /** 捲動區的無障礙名稱，例：「個資保護聲明內容」 */
  regionLabel: string
  /** 內文是否已就緒；載入中／錯誤時傳 false，避免短內容被誤判為「已讀到底」 */
  ready?: boolean
}

/**
 * 合約捲動框＋同意 Checkbox（docs/design/register/README.md「合約捲動框＋同意 Checkbox」）。
 * 內文要捲到底，Checkbox 才能勾選；內文比捲動區短（不需要捲）時直接啟用。
 * 一旦讀到底就維持可勾選，之後往回捲也不會再停用。
 */
export default function ScrollAgreement({
  children,
  label,
  checked,
  onChange,
  regionLabel,
  ready = true,
}: ScrollAgreementProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [reachedEnd, setReachedEnd] = useState(false)

  const checkReachedEnd = useCallback(() => {
    const box = boxRef.current
    if (!box || !ready) return
    if (box.scrollTop + box.clientHeight >= box.scrollHeight - BOTTOM_TOLERANCE) setReachedEnd(true)
  }, [ready])

  // 內文載入後、視窗或字型變動造成高度改變時重新判斷（內文太短不需捲動時直接啟用）
  useEffect(() => {
    if (!ready || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(checkReachedEnd)
    if (boxRef.current) observer.observe(boxRef.current)
    if (contentRef.current) observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [ready, checkReachedEnd])

  return (
    <div className={styles.wrapper}>
      <div
        ref={boxRef}
        className={styles.box}
        onScroll={checkReachedEnd}
        role="region"
        aria-label={regionLabel}
        // 讓鍵盤使用者也能聚焦後用方向鍵捲動
        tabIndex={0}
      >
        <div ref={contentRef}>{children}</div>
      </div>
      <div className={styles.agree}>
        <Checkbox
          checked={checked}
          disabled={!reachedEnd}
          onChange={(e) => onChange(e.target.checked)}
          classNames={{ label: styles.label }}
        >
          {label}
        </Checkbox>
      </div>
    </div>
  )
}
