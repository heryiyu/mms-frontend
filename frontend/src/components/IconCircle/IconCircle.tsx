import Icon from '../Icon'
import { cx } from '../../utils/cx'
import styles from './IconCircle.module.css'

/**
 * 主色淺底圓形圖示（首頁功能卡片、會員審核空狀態共用）。
 * 尺寸由 className 覆寫 CSS 變數：--icon-circle-size（圓直徑，預設 36px）、
 * --icon-circle-icon-size（圖示字級，預設 BodyL）。
 */
export default function IconCircle({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cx(styles.circle, className)}>
      <Icon name={name} />
    </span>
  )
}
