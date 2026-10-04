import { App, Button } from 'antd'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// 有新版 Service Worker 時提示使用者重新整理
export default function PwaUpdatePrompt() {
  const { notification } = App.useApp()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    notification.info({
      key: 'pwa-update',
      title: '有新版本可用',
      description: '重新整理即可套用最新版本。',
      duration: 0,
      actions: (
        <Button type="primary" size="small" onClick={() => updateServiceWorker(true)}>
          重新整理
        </Button>
      ),
      onClose: () => setNeedRefresh(false),
    })
  }, [needRefresh, notification, setNeedRefresh, updateServiceWorker])

  return null
}
