import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import NoticeModal from './NoticeModal'
import type { NoticeModalProps } from './NoticeModal'

export type NotifyOptions = Pick<NoticeModalProps, 'title' | 'content' | 'okText' | 'cancelText'>

interface State extends NotifyOptions {
  open: boolean
}

/**
 * 命令式呼叫通知彈窗。用法：
 *
 *   const { notify, contextHolder } = useNotifyModal()
 *   await notify({ title: '登入失敗', content: '帳號或密碼錯誤' })
 *   const ok = await notify({ title: '確定退回？', content: '…', cancelText: '取消' })
 *   return <>{contextHolder}…</>
 *
 * notify 回傳 Promise<boolean>：按「確認」為 true，按 ✕／Esc／遮罩／「取消」為 false。
 * 前一個彈窗尚未關閉時再呼叫，前一個視為取消（false）並由新內容取代。
 */
export function useNotifyModal(): { notify: (options: NotifyOptions) => Promise<boolean>; contextHolder: ReactNode } {
  const [state, setState] = useState<State>({ open: false, title: null })
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)

  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok)
    resolverRef.current = null
    setState((s) => ({ ...s, open: false }))
  }, [])

  const notify = useCallback((options: NotifyOptions) => {
    resolverRef.current?.(false)
    setState({ ...options, open: true })
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const contextHolder = (
    <NoticeModal
      open={state.open}
      title={state.title}
      content={state.content}
      okText={state.okText}
      cancelText={state.cancelText}
      onOk={() => settle(true)}
      onCancel={() => settle(false)}
    />
  )

  return { notify, contextHolder }
}
