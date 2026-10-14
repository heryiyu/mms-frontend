import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import type { ProgressQueryResponse } from '../../api/types'
import { isLogtoEnabled } from '../../auth/logto'
import ContactEmailLink from '../../components/ContactEmailLink'
import ResultPage, { type ResultPageProps } from '../../components/ResultPage'
import { PATHS } from '../../routes/paths'
import styles from './ProgressResult.module.css'

/**
 * 審核進度查詢結果（#52）。設計稿未畫，沿用等待審核頁的整頁結果版面（ResultPage fullPage）：
 * - 待審核：無圖示（同等待審核頁）＋申請日期
 * - 已通過：成功圖示＋審核日期，「前往登入」
 * - 未通過：警告圖示＋退回原因＋審核日期；Logto 模式可登入後修改資料重新送出（#48），「前往登入」
 * 結果由查詢頁以 navigation state 帶入；直接開這個網址（沒有結果）時回查詢頁。
 */

export interface ProgressResultState {
  result: ProgressQueryResponse
}

const formatDate = (iso?: string) => (iso ? dayjs(iso).format('YYYY/MM/DD') : undefined)

export default function ProgressResult() {
  const navigate = useNavigate()
  const result = (useLocation().state as Partial<ProgressResultState> | null)?.result
  if (!result) return <Navigate to={PATHS.progress} replace />

  const submittedAt = formatDate(result.submittedAt)
  const reviewedAt = formatDate(result.reviewedAt)
  const goLogin = () => navigate(PATHS.login)
  const contact = (
    <>
      有任何問題請聯繫
      <ContactEmailLink />
    </>
  )

  const lines = (...items: ReactNode[]) =>
    items
      .filter(Boolean)
      .map((item, index) => (
        <span key={index} className={styles.line}>
          {item}
        </span>
      ))

  const props: ResultPageProps = (() => {
    switch (result.status) {
      case 'APPROVED':
        return {
          status: 'success',
          title: '已通過審核',
          description: lines(reviewedAt && `審核日期：${reviewedAt}`, '可以登入會員中心了'),
          backText: '前往登入',
        }
      case 'REJECTED':
        return {
          status: 'warning',
          title: '申請未通過審核',
          description: lines(
            result.rejectReason && <strong className={styles.reason}>退回原因：{result.rejectReason}</strong>,
            reviewedAt && `審核日期：${reviewedAt}`,
            isLogtoEnabled ? '請登入會員中心修改資料後重新送出' : undefined,
            contact,
          ),
          backText: isLogtoEnabled ? '前往登入' : '返回',
        }
      default:
        return {
          icon: null,
          title: '等待審核中',
          description: lines(submittedAt && `申請日期：${submittedAt}`, '審核結果將以電子信箱或手機簡訊通知', contact),
        }
    }
  })()

  return <ResultPage fullPage {...props} onBack={goLogin} />
}
