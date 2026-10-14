// 會員審核（區長以上）；一般會員呼叫會得到 FORBIDDEN
import { get, post } from './client'
import type { ApproveRequest, ApproveResponse, PendingCountResponse, PendingMember, RejectRequest } from './types'

/** 待審核人數（首頁「會員審核」卡片徽章） */
export function getPendingCount(): Promise<PendingCountResponse> {
  return get<PendingCountResponse>('/members/pending/count')
}

/** 待審核清單 */
export function getPendingMembers(): Promise<PendingMember[]> {
  return get<PendingMember[]>('/members/pending')
}

/** 批次審核通過（只送勾選的 id） */
export function approveMembers(ids: string[]): Promise<ApproveResponse> {
  const body: ApproveRequest = { ids }
  return post<ApproveResponse>('/members/approve', body)
}

/** 單筆退回，附退回原因（#48 D10）。錯誤碼：MEMBER_NOT_FOUND、ALREADY_PROCESSED、VALIDATION_ERROR */
export function rejectMember(id: string, reason: string): Promise<void> {
  const body: RejectRequest = { reason }
  return post<void>(`/members/${encodeURIComponent(id)}/reject`, body)
}
