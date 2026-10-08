import { getApiErrorMessage, isApiError } from '../../api/client'
import type { NotifyOptions } from '../../components/NoticeModal'
import ContactEmailLink from '../../components/ContactEmailLink'

// 登入失敗的通知彈窗內容（docs/design/login/README.md 各 popup）。標題一律「通知」，內文照稿換行。
// ACCOUNT_PENDING 不走彈窗，由呼叫端導向等待審核頁。

const TITLE = '通知'

const contactLine = (
  <>
    請聯繫
    <ContactEmailLink />
  </>
)

export const TOO_MANY_ATTEMPTS_NOTICE: NotifyOptions = { title: TITLE, content: '登入過度頻繁\n請稍後登入' }

export function getLoginErrorNotice(error: unknown): NotifyOptions {
  if (isApiError(error, 'ACCOUNT_NOT_FOUND')) return { title: TITLE, content: '查無此帳號' }
  if (isApiError(error, 'WRONG_PASSWORD')) return { title: TITLE, content: '密碼輸入錯誤' }
  if (isApiError(error, 'TOO_MANY_ATTEMPTS')) return TOO_MANY_ATTEMPTS_NOTICE
  if (isApiError(error, 'ACCOUNT_LOCKED')) {
    return {
      title: TITLE,
      // 稿上為「帳號以鎖定」，判定為誤植改「已」
      content: (
        <>
          {'登入過度頻繁\n帳號已鎖定\n\n'}
          {contactLine}
        </>
      ),
    }
  }
  if (isApiError(error, 'ACCOUNT_REJECTED')) {
    // 申請被退回的彈窗設計未畫，已確認（#12） L4：比照帳號鎖定的版面，只換文字
    return {
      title: TITLE,
      content: (
        <>
          {'申請未通過審核\n\n'}
          {contactLine}
        </>
      ),
    }
  }
  if (isApiError(error, 'NETWORK_ERROR')) return { title: TITLE, content: error.message }
  // 其他錯誤（5xx、未知）不顯示「API 500」這類技術訊息。已確認（#12） L4：維持目前文案
  return { title: TITLE, content: getApiErrorMessage(error, '登入失敗，請稍後再試') }
}
