import type { Role } from '../api/types'

// 登入後版型的導覽設定（docs/design/layout/README.md、docs/design/member-home/README.md）
// 側邊選單與手機抽屜選單共用 memberMenuItems；麵包屑用 memberRouteTitles 依路由組出階層

export interface MemberMenuItem {
  path: string
  label: string
  /** 可看到此項目的角色；未設定 = 所有登入者皆可見。角色權限（#10）完成前不會實際過濾 */
  roles?: Role[]
}

export const memberMenuItems: MemberMenuItem[] = [
  { path: '/profile', label: '個人資訊' },
  { path: '/change-password', label: '修改密碼' },
  // TODO(#12)：「系統設定」只出現在 web 自動登出那張圖，功能與可見角色待確認（docs/design/questions.md）
  // 暫定只給 leader 看；路徑亦為暫定
  { path: '/settings', label: '系統設定', roles: ['leader'] },
]

/**
 * 依角色過濾選單。
 * role 未傳（角色權限 #10 尚未接上）時回傳全部項目。
 */
export function getMemberMenuItems(role?: Role): MemberMenuItem[] {
  if (!role) return memberMenuItems
  return memberMenuItems.filter((item) => !item.roles || item.roles.includes(role))
}

export const HOME_PATH = '/'

/** 路徑 → 麵包屑名稱（不在選單裡的頁面，例如首頁卡片進入的功能頁，也列在這裡） */
export const memberRouteTitles: Record<string, string> = {
  [HOME_PATH]: '首頁',
  '/profile': '個人資訊',
  '/change-password': '修改密碼',
  '/member-review': '會員審核',
  '/receipt': '奉獻收據下載',
  '/settings': '系統設定', // TODO(#12) 同上
}

/** 依目前路徑組出麵包屑：首頁 / 第一層 / 第二層…（只列有對應名稱的層級） */
export function getMemberBreadcrumb(pathname: string): { path: string; title: string }[] {
  const crumbs = [{ path: HOME_PATH, title: memberRouteTitles[HOME_PATH] }]
  const segments = pathname.split('/').filter(Boolean)
  segments.forEach((_, i) => {
    const path = `/${segments.slice(0, i + 1).join('/')}`
    const title = memberRouteTitles[path]
    if (title) crumbs.push({ path, title })
  })
  return crumbs
}

/** 選單選中的 key：目前路徑本身或其上層對應到的選單項目 */
export function getSelectedMenuKey(pathname: string): string | undefined {
  return memberMenuItems.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))?.path
}
