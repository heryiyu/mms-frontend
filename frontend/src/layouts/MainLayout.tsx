import { Grid, Layout, Menu, theme } from 'antd'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import Icon from '../components/Icon'
import styles from './MainLayout.module.css'

// 導覽項目先放範例，拿到 Figma 後依設計調整
const navItems = [
  { path: '/', label: '首頁', icon: 'house' },
  { path: '/profile', label: '會員資料', icon: 'person' },
]

// RWD：桌機（≥ lg）左側選單，手機/平板底部 Tab Bar
export default function MainLayout() {
  const screens = Grid.useBreakpoint()
  const isDesktop = !!screens.lg
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { token } = theme.useToken()

  return (
    <Layout className={styles.layout}>
      <Layout.Header className={styles.header} style={{ background: token.colorBgContainer }}>
        <span className={styles.brand}>NLC 會員中心</span>
      </Layout.Header>
      <Layout>
        {isDesktop && (
          <Layout.Sider width={220} theme="light">
            <Menu
              mode="inline"
              selectedKeys={[pathname]}
              items={navItems.map((item) => ({
                key: item.path,
                icon: <Icon name={item.icon} />,
                label: item.label,
              }))}
              onClick={({ key }) => navigate(key)}
            />
          </Layout.Sider>
        )}
        <Layout.Content className={styles.content}>
          <Outlet />
        </Layout.Content>
      </Layout>
      {!isDesktop && (
        <nav className={styles.tabbar} style={{ background: token.colorBgContainer }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) => [styles.tab, isActive && styles.tabActive].filter(Boolean).join(' ')}
              style={({ isActive }) => (isActive ? { color: token.colorPrimary } : undefined)}
            >
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </Layout>
  )
}
