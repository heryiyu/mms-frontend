import { Breadcrumb, Button, Drawer, Grid, Layout, Menu, type MenuProps } from 'antd'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { logout } from '../api/auth'
import IdleLogoutNotice from '../auth/IdleLogoutNotice'
import { useAuth } from '../auth/useAuth'
import Icon from '../components/Icon'
import { PATHS } from '../routes/paths'
import { cx } from '../utils/cx'
import styles from './MemberLayout.module.css'
import { getMemberBreadcrumb, getMemberMenuItems, getSelectedMenuKey } from './memberNav'

// 教會 Logo：設計稿為主色方形圓角底＋白色「NewLife」手寫字
// TODO：拿到正式 Logo 圖檔後改用圖片
function BrandLogo({ className }: { className?: string }) {
  return (
    <Link to={PATHS.home} className={cx(styles.logo, className)} aria-label="回到首頁">
      <span className={styles.logoText}>NewLife</span>
    </Link>
  )
}

/**
 * 登入後版型（docs/design/layout/README.md 2.2、3.3）
 * - ≥ lg：左側固定 220px 側邊選單（Logo、選單、底部登出）＋頂部麵包屑列
 * - < lg：頂部 48px top bar（左 Logo、右漢堡），選單收進右側抽屜；無麵包屑
 */
export default function MemberLayout() {
  const { role } = useAuth()
  const screens = Grid.useBreakpoint()
  const isDesktop = !!screens.lg
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = getMemberMenuItems(role)
  const selectedKey = getSelectedMenuKey(pathname)
  const selectedKeys = selectedKey ? [selectedKey] : []

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    setDrawerOpen(false)
    navigate(key)
  }

  const handleLogout = async () => {
    setDrawerOpen(false)
    try {
      await logout()
    } finally {
      navigate(PATHS.login, { replace: true })
    }
  }

  const logoutButton = (
    <Button type="text" className={styles.logout} onClick={handleLogout}>
      登出
    </Button>
  )

  return (
    <>
      <Layout className={styles.layout} hasSider={isDesktop}>
        {isDesktop ? (
          <Layout.Sider width="var(--layout-sider-width)" theme="light" className={styles.sider}>
            <div className={styles.siderInner}>
              <div className={styles.siderHeader}>
                <BrandLogo />
              </div>
              <nav className={styles.siderNav} aria-label="功能選單">
                <Menu
                  mode="inline"
                  className={styles.menu}
                  selectedKeys={selectedKeys}
                  items={navItems.map((item) => ({ key: item.path, label: item.label }))}
                  onClick={handleMenuClick}
                />
              </nav>
              <div className={styles.siderFooter}>{logoutButton}</div>
            </div>
          </Layout.Sider>
        ) : (
          <header className={styles.topBar}>
            <BrandLogo className={styles.logoMobile} />
            <Button
              type="text"
              className={styles.menuButton}
              icon={<Icon name="list" size="var(--font-size-headline-4)" />}
              aria-label="開啟功能選單"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
            />
          </header>
        )}

        <Layout className={styles.main}>
          {isDesktop && (
            <div className={styles.breadcrumbBar}>
              <Breadcrumb
                className={styles.breadcrumb}
                items={getMemberBreadcrumb(pathname).map((crumb, i, all) => ({
                  key: crumb.path,
                  title: i < all.length - 1 ? <Link to={crumb.path}>{crumb.title}</Link> : crumb.title,
                }))}
              />
            </div>
          )}
          <Layout.Content className={styles.content}>
            <Outlet />
          </Layout.Content>
        </Layout>
      </Layout>

      {!isDesktop && (
        // 手機選單：右側滑出約 90% 寬（docs/design/member-home/功能選單展開.png）
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="right"
          size="90%"
          title="功能選單"
          closable={{ placement: 'end' }}
          closeIcon={<Icon name="x-lg" label="關閉功能選單" />}
          rootClassName={styles.drawer}
          footer={logoutButton}
        >
          <Menu
            mode="inline"
            className={styles.drawerMenu}
            selectedKeys={selectedKeys}
            items={navItems.flatMap((item, i) => [
              ...(i > 0 ? [{ type: 'divider' as const, key: `divider-${item.path}` }] : []),
              { key: item.path, label: item.label },
            ])}
            onClick={handleMenuClick}
          />
        </Drawer>
      )}

      {/* 閒置 7 分鐘自動登出（#11） */}
      <IdleLogoutNotice />
    </>
  )
}
