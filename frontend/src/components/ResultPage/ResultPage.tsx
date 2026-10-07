import type { ReactNode } from 'react'
import { ConfigProvider, Result } from 'antd'
import { Button } from '../Button'
import Icon from '../Icon'
import typography from '../../styles/typography.module.css'
import { colors, typography as typeScale } from '../../theme/tokens'
import { cx } from '../../utils/cx'
import styles from './ResultPage.module.css'

// 完成結果頁（docs/design/receipt/README.md「完成」、member-review 審核完成／退回完成共用）
// 內容區垂直水平置中：主色圓圈勾勾 + 標題 + 說明 + 主色文字「返回」
// 例：「審核完成！」「變更完成！」「奉獻收據已送出，請至信箱查收！」
//
// 只出過成功樣式；失敗／警告照成功頁版面，只換圖示與顏色（status，C3 已確認（#12））。
// 「返回」導向哪裡由呼叫端 onBack 決定。

export type ResultStatus = 'success' | 'error' | 'warning'

const STATUS_ICONS: Record<ResultStatus, { name: string; color: string; label: string }> = {
  success: { name: 'check-circle', color: colors.primary, label: '完成' },
  error: { name: 'x-circle', color: colors.error, label: '失敗' },
  warning: { name: 'exclamation-circle', color: colors.secondary2, label: '注意' },
}

export interface ResultPageProps {
  title: ReactNode
  description?: ReactNode
  /** 決定預設圖示與顏色：成功主色勾勾、失敗紅色叉叉、警告橘色驚嘆號。預設 success */
  status?: ResultStatus
  /** 自訂圖示，優先於 status；傳 null 不顯示圖示（例：等待審核頁） */
  icon?: ReactNode
  /** 返回按鈕文字，預設「返回」 */
  backText?: ReactNode
  onBack?: () => void
  /** 額外動作，會放在返回按鈕旁 */
  extra?: ReactNode
  /**
   * 整頁版（不在任何版型內）：外包 <main>，整頁 bgLayout、避開安全區域，標題／說明／返回間距較緊。
   * 例：等待審核、註冊等待核准中、Line 創建成功。
   */
  fullPage?: boolean
  className?: string
}

// Result 元件 token 對應設計稿字級：標題 Headline5、說明 Body1（gray1）
const resultTheme = {
  components: {
    Result: {
      titleFontSize: typeScale.headline5.fontSize,
      subtitleFontSize: typeScale.body1.fontSize,
    },
  },
}

export default function ResultPage({
  title,
  description,
  status = 'success',
  icon,
  backText = '返回',
  onBack,
  extra,
  fullPage,
  className,
}: ResultPageProps) {
  const actions = (
    <>
      {onBack && (
        <Button variant="text" onClick={onBack}>
          {backText}
        </Button>
      )}
      {extra}
    </>
  )

  const content = (
    <div className={cx(styles.wrapper, fullPage && styles.compact, className)}>
      <ConfigProvider theme={resultTheme}>
        <Result
          className={styles.result}
          icon={
            icon === undefined ? (
              <Icon
                name={STATUS_ICONS[status].name}
                className={styles.icon}
                color={STATUS_ICONS[status].color}
                label={STATUS_ICONS[status].label}
              />
            ) : (
              icon
            )
          }
          title={<h1 className={cx(typography.headline5, styles.title)}>{title}</h1>}
          subTitle={description && <p className={styles.description}>{description}</p>}
          extra={onBack || extra ? actions : undefined}
        />
      </ConfigProvider>
    </div>
  )

  return fullPage ? <main className={styles.fullPage}>{content}</main> : content
}
