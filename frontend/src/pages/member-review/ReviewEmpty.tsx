import { Button } from '../../components/Button'
import IconCircle from '../../components/IconCircle'
import typography from '../../styles/typography.module.css'
import { cx } from '../../utils/cx'
import styles from './ReviewEmpty.module.css'

// 空狀態：沒有待審核的申請（設計稿未畫，依 frontend-design 補，沿用既有設計語彙）
// - 與申請者卡片同樣的白底圓角卡片，讓清單「被清空」而不是整頁換版
// - 圖示沿用首頁「會員審核」卡片的人像＋勾（主色淺底圓），標題 Headline5、說明 Body2 gray2
// - 唯一的下一步：主色文字按鈕回首頁
// 已確認（#12） R3：維持目前文案與樣式

export default function ReviewEmpty({ onBack }: { onBack: () => void }) {
  return (
    <section className={styles.empty} aria-labelledby="member-review-empty-title">
      <IconCircle name="person-check" className={styles.icon} />
      <h2 id="member-review-empty-title" className={cx(typography.headline5, styles.title)}>
        目前沒有待審核的申請
      </h2>
      <p className={styles.description}>新會員送出註冊申請後，會出現在這裡。</p>
      <Button variant="text" onClick={onBack}>
        返回首頁
      </Button>
    </section>
  )
}
