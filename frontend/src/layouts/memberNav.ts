import type { Role } from '../api/types'
import { hasMinRole } from '../auth/roles'
import { PATHS } from '../routes/paths'

// 登入後版型的導覽設定（docs/design/layout/README.md、docs/design/member-home/README.md）
// 側邊選單與手機抽屜選單共用 memberMenuItems；首頁「常見功能」卡片用 memberQuickActions；
// 麵包屑用 memberRouteTitles 依路由組出階層。可見角色與路由守衛（routes/index.tsx 的 RequireRole）要一致。

export interface MemberMenuItem {
  path: string
  label: string
  /** 需要此角色以上才看得到；未設定 = 所有登入者皆可見 */
  minRole?: Role
  /** 只有 SSO 帳號有密碼的人看得到（GET /me 的 hasPassword，#49）：只用 Line／Google 登入的人不顯示 */
  requiresPassword?: boolean
}

export const memberMenuItems: MemberMenuItem[] = [
  { path: PATHS.profile, label: '個人資訊' },
  { path: PATHS.changePassword, label: '修改密碼', requiresPassword: true },
  // TODO(#12)：「系統設定」只出現在 web 自動登出那張圖，功能與可見角色待確認（docs/design/questions.md）
  // 暫定只給區長以上看；路徑亦為暫定
  { path: PATHS.settings, label: '系統設定', minRole: 'leader' },
]

/**
 * 依角色與有沒有密碼過濾選單。hasPassword 為 undefined（/me 還沒載入）時先不顯示需要密碼的項目，
 * 避免沒有密碼的人看到「修改密碼」閃一下。
 */
export function getMemberMenuItems(role: Role | null, hasPassword?: boolean): MemberMenuItem[] {
  return memberMenuItems.filter(
    (item) => hasMinRole(role, item.minRole) && (!item.requiresPassword || hasPassword === true),
  )
}

export interface MemberQuickAction extends MemberMenuItem {
  /** Bootstrap Icons 名稱 */
  icon: string
}

/** 首頁「常見功能」卡片：區長以上才有「會員審核」，一般會員只有「奉獻收據下載」 */
export const memberQuickActions: MemberQuickAction[] = [
  { path: PATHS.memberReview, label: '會員審核', icon: 'person-check-fill', minRole: 'leader' },
  { path: PATHS.receipt, label: '奉獻收據下載', icon: 'download' },
]

export function getMemberQuickActions(role: Role | null): MemberQuickAction[] {
  return memberQuickActions.filter((item) => hasMinRole(role, item.minRole))
}

/** 路徑 → 麵包屑名稱（不在選單裡的頁面，例如首頁卡片進入的功能頁，也列在這裡） */
export const memberRouteTitles: Record<string, string> = {
  [PATHS.home]: '首頁',
  [PATHS.profile]: '個人資訊',
  [PATHS.profileEdit]: '編輯資料',
  [PATHS.changePassword]: '修改密碼',
  [PATHS.memberReview]: '會員審核',
  [PATHS.receipt]: '奉獻收據下載',
  [PATHS.settings]: '系統設定', // TODO(#12) 同上
  [PATHS.forbidden]: '沒有權限',
}

/** 依目前路徑組出麵包屑：首頁 / 第一層 / 第二層…（只列有對應名稱的層級） */
export function getMemberBreadcrumb(pathname: string): { path: string; title: string }[] {
  const crumbs: { path: string; title: string }[] = [{ path: PATHS.home, title: memberRouteTitles[PATHS.home] }]
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
