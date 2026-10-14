import { Spin } from 'antd'
import { BrandLogo } from '../../layouts/GuestBrandHeader'
import styles from './LoginView.module.css'

/**
 * 登入 loading（docs/design/login/README.md「loading」）：整頁半透明遮罩＋置中主色 Logo＋白字「Loading」，
 * 遮罩期間無法操作。用 AntD Spin fullscreen，指示器換成品牌 Logo。
 * mob 稿的 Logo 較小且與「登入」按鈕重疊（稿面瑕疵），實作一律置中於遮罩。
 */
export default function LoginLoading({ spinning }: { spinning: boolean }) {
  return (
    <Spin
      fullscreen
      spinning={spinning}
      indicator={<BrandLogo />}
      description="Loading"
      classNames={{ root: styles.loading, indicator: styles.loadingLogo, description: styles.loadingText }}
    />
  )
}
