// 下拉選項：教會 → 牧區 → 小組 → EKK 連動，以及靈程
import { http, HttpResponse } from 'msw'
import { churches, districts, ekks, groups, journeys } from '../db'
import { api, errorResponse, mockDelay } from '../utils'

/** 取出必填的 query 參數，缺少時回 VALIDATION_ERROR */
function requireParam(request: Request, name: string): string {
  const value = new URL(request.url).searchParams.get(name)
  if (!value) throw errorResponse('VALIDATION_ERROR', undefined, { [name]: '必填' })
  return value
}

const toOptions = (list: { id: string; name: string }[]) => list.map(({ id, name }) => ({ id, name }))

export const optionsHandlers = [
  http.get(api('/options/churches'), async () => {
    await mockDelay()
    return HttpResponse.json(toOptions(churches))
  }),

  http.get(api('/options/districts'), async ({ request }) => {
    await mockDelay()
    const churchId = requireParam(request, 'churchId')
    return HttpResponse.json(toOptions(districts.filter((d) => d.churchId === churchId)))
  }),

  http.get(api('/options/groups'), async ({ request }) => {
    await mockDelay()
    const districtId = requireParam(request, 'districtId')
    return HttpResponse.json(toOptions(groups.filter((g) => g.districtId === districtId)))
  }),

  http.get(api('/options/ekk'), async ({ request }) => {
    await mockDelay()
    const groupId = requireParam(request, 'groupId')
    return HttpResponse.json(toOptions(ekks.filter((e) => e.groupId === groupId)))
  }),

  http.get(api('/options/journeys'), async () => {
    await mockDelay()
    return HttpResponse.json(journeys)
  }),
]
