import { Flex, Spin } from 'antd'

/**
 * 頁面程式碼下載中的佔位（路由 lazy 載入首次進站時顯示）。設計稿未畫，僅置中 Spin。
 * 站內換頁時 React Router 會停留在原頁直到新頁載入完成，不會顯示此元件。
 */
export default function PageLoading() {
  return (
    <Flex align="center" justify="center" style={{ minHeight: '100dvh' }}>
      <Spin />
    </Flex>
  )
}
