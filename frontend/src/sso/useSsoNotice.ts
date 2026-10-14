import { useCallback } from 'react'
import { useNotifyModal } from '../components/NoticeModal'
import { isExperienceError } from './api/client'
import { getExperienceErrorMessage } from './api/errors'
import { MEMBER_CENTER_LOGIN_URL } from './paths'

/** 通知彈窗標題（同會員中心登入、註冊、忘記密碼頁） */
export const NOTICE_TITLE = '通知'

/**
 * SSO 各頁的通知彈窗（伺服器回的錯誤一律跳彈窗，同會員中心）。
 * notifyError：顯示錯誤碼對應的中文提示（api/errors.ts）；session.not_found（沒有進行中的登入、逾時）
 * 關閉彈窗後回會員中心登入頁重新發起登入。
 *
 *   const { notify, notifyError, contextHolder } = useSsoNotice()
 *   try { … } catch (error) { void notifyError(error) }
 */
export function useSsoNotice() {
  const { notify, contextHolder } = useNotifyModal()

  const notifyError = useCallback(
    async (error: unknown, fallback?: string) => {
      await notify({ title: NOTICE_TITLE, content: getExperienceErrorMessage(error, fallback) })
      if (isExperienceError(error, 'session.not_found')) window.location.assign(MEMBER_CENTER_LOGIN_URL)
    },
    [notify],
  )

  return { notify, notifyError, contextHolder }
}

export type SsoNotice = ReturnType<typeof useSsoNotice>
