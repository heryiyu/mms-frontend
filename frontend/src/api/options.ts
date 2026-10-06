// 下拉選項：教會 → 牧區 → 小組 → EKK 連動，以及靈程
import { get } from './client'
import type { JourneyOption, Option } from './types'

export function getChurches(): Promise<Option[]> {
  return get<Option[]>('/options/churches')
}

/** 依教會取得牧區 */
export function getDistricts(churchId: string): Promise<Option[]> {
  return get<Option[]>(`/options/districts?churchId=${encodeURIComponent(churchId)}`)
}

/** 依牧區取得小組 */
export function getGroups(districtId: string): Promise<Option[]> {
  return get<Option[]>(`/options/groups?districtId=${encodeURIComponent(districtId)}`)
}

/** 依小組取得 EKK（設計未說明 EKK 依誰連動，暫定依小組） */
export function getEkks(groupId: string): Promise<Option[]> {
  return get<Option[]>(`/options/ekk?groupId=${encodeURIComponent(groupId)}`)
}

/** 靈程選項（NF／VIP／XN） */
export function getJourneys(): Promise<JourneyOption[]> {
  return get<JourneyOption[]>('/options/journeys')
}
