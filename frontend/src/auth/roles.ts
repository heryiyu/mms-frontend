// 角色定義與權限判斷。「區長以上」以角色等級比較，之後若細分區長／牧區長／主任牧師，只要在 ROLE_RANK 加上等級即可。
import type { Role } from '../api/types'

export const ROLE_LABELS: Record<Role, string> = {
  member: '一般會員',
  leader: '區長以上',
}

/** 角色等級，數字越大權限越高 */
const ROLE_RANK: Record<Role, number> = {
  member: 0,
  leader: 1,
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && Object.hasOwn(ROLE_RANK, value)
}

/** role 是否達到 minRole 以上；minRole 未指定 = 所有登入者皆可；role 為空（未登入）一律 false */
export function hasMinRole(role: Role | null | undefined, minRole?: Role): boolean {
  if (!role) return false
  if (!minRole) return true
  return ROLE_RANK[role] >= ROLE_RANK[minRole]
}
