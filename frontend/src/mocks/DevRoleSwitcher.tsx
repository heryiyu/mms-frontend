// 開發用：不經登入頁直接切換登入身分（只在 npm run dev、啟用 MSW 且為本機模式時出現，見 src/main.tsx）。
// 切換後寫入 auth store，token 為 MSW 測試帳號的 token，所以 API 也會以該身分回應。
import { Dropdown, FloatButton, type MenuProps } from 'antd'
import type { AccountStatus } from '../api/types'
import { authStore } from '../auth/store'
import { useAuth } from '../auth/useAuth'
import Icon from '../components/Icon'
import { db } from './db'
import { makeToken } from './utils'

interface Identity {
  key: string
  label: string
  /** db.ts 的使用者 id（只有手機的會員沒有 email，用 id 對應） */
  userId?: string
  status?: AccountStatus
}

const IDENTITIES: Identity[] = [
  { key: 'guest', label: '未登入' },
  { key: 'member', label: '一般會員（member@test.com）', userId: 'u1', status: 'ACTIVE' },
  { key: 'leader', label: '區長以上（leader@test.com）', userId: 'u2', status: 'ACTIVE' },
  // #49：沒有密碼（看不到修改密碼）、沒有手機（可在個人資訊新增）
  { key: 'google', label: '只用 Google 登入（google@test.com）', userId: 'u8', status: 'ACTIVE' },
  // #50：只有手機（奉獻收據寄簡訊下載連結）、沒有身分證字號（收據密碼改用出生年月日）
  { key: 'phoneonly', label: '只有手機（0911333444）', userId: 'u9', status: 'ACTIVE' },
  { key: 'noid', label: '沒有身分證字號（noid@test.com）', userId: 'u10', status: 'ACTIVE' },
  { key: 'pending', label: '等待審核（pending@test.com）', userId: 'u4', status: 'PENDING' },
]

const findUser = (identity?: Identity) =>
  identity?.userId ? db.users.find((user) => user.id === identity.userId) : undefined

function currentKey(token: string | null, status: AccountStatus | undefined): string {
  if (!token) return 'guest'
  const match = IDENTITIES.find((item) => {
    const user = findUser(item)
    return user && makeToken(user) === token && item.status === status
  })
  return match?.key ?? ''
}

export default function DevRoleSwitcher() {
  const { session } = useAuth()

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    const identity = IDENTITIES.find((item) => item.key === key)
    const user = findUser(identity)
    if (!identity || !user || !identity.status) {
      authStore.clear()
      return
    }
    const token = makeToken(user)
    authStore.setSession({ id: token, token, role: user.role, status: identity.status })
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
        // tooltip 放右側：預設會蓋住往上展開的選單最下面一項（等待審核），導致點不到
        tooltip={{ title: '開發用：切換登入身分', placement: 'right' }}
        style={{ insetInlineStart: 'var(--app-gutter)', insetInlineEnd: 'auto' }}
      />
    </Dropdown>
  )
}
