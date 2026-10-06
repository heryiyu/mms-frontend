// 開發用：不經登入頁直接切換登入身分（只在 npm run dev 且啟用 MSW 時出現，見 src/main.tsx）。
// 切換後寫入 auth store，token 為 MSW 測試帳號的 token，所以 API 也會以該身分回應。
import { Dropdown, FloatButton, type MenuProps } from 'antd'
import type { AccountStatus } from '../api/types'
import { authStore } from '../auth/store'
import { useAuth } from '../auth/useAuth'
import Icon from '../components/Icon'
import { findUserByEmail } from './db'
import { makeToken } from './utils'

interface Identity {
  key: string
  label: string
  email?: string
  status?: AccountStatus
}

const IDENTITIES: Identity[] = [
  { key: 'guest', label: '未登入' },
  { key: 'member', label: '一般會員（member@test.com）', email: 'member@test.com', status: 'ACTIVE' },
  { key: 'leader', label: '區長以上（leader@test.com）', email: 'leader@test.com', status: 'ACTIVE' },
  { key: 'pending', label: '等待審核（pending@test.com）', email: 'pending@test.com', status: 'PENDING' },
]

function currentKey(token: string | null, status: AccountStatus | undefined): string {
  if (!token) return 'guest'
  const match = IDENTITIES.find((item) => {
    const user = item.email ? findUserByEmail(item.email) : undefined
    return user && makeToken(user) === token && item.status === status
  })
  return match?.key ?? ''
}

export default function DevRoleSwitcher() {
  const { session } = useAuth()

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    const identity = IDENTITIES.find((item) => item.key === key)
    const user = identity?.email ? findUserByEmail(identity.email) : undefined
    if (!identity || !user || !identity.status) {
      authStore.clear()
      return
    }
    authStore.setSession({ token: makeToken(user), role: user.role, status: identity.status })
  }

  return (
    <Dropdown
      trigger={['click']}
      placement="topLeft"
      menu={{
        items: IDENTITIES.map(({ key, label }) => ({ key, label })),
        selectable: true,
        selectedKeys: [currentKey(session?.token ?? null, session?.status)],
        onClick: handleClick,
      }}
    >
      <FloatButton
        icon={<Icon name="person-gear" />}
        tooltip="開發用：切換登入身分"
        style={{ insetInlineStart: 'var(--app-gutter)', insetInlineEnd: 'auto' }}
      />
    </Dropdown>
  )
}
