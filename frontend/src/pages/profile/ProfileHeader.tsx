import { Link } from 'react-router'
import Icon from '../../components/Icon'
import { PATHS } from '../../routes/paths'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import styles from './Profile.module.css'

/** 從個人資訊檢視頁進入修改頁時帶的 location.state，修改頁「取消／返回」據此回上一頁 */
export interface ProfileEditLocationState {
  fromProfile?: boolean
}

interface ProfileHeaderProps {
  /** 顯示右側「編輯資料」連結 */
  showEdit?: boolean
  /** 目前已在修改頁（連結標成 aria-current，點了不導頁） */
  editing?: boolean
}

/** 頁面標題列：左「個人資訊」、右主色「編輯資料」＋ pencil-square（docs/design/profile/README.md） */
export default function ProfileHeader({ showEdit, editing }: ProfileHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={cx(typography.pageTitle, styles.title)}>個人資訊</h1>
      {showEdit && (
        <Link
          to={PATHS.profileEdit}
          state={{ fromProfile: true } satisfies ProfileEditLocationState}
          // TODO(#12)：web 修改頁仍顯示「編輯資料」，點了要做什麼未定；先維持在原頁（不重新導頁、保留已輸入內容）
          onClick={editing ? (e) => e.preventDefault() : undefined}
          aria-current={editing ? 'page' : undefined}
          className={styles.editLink}
        >
          編輯資料
          <Icon name="pencil-square" />
        </Link>
      )}
    </div>
  )
}
