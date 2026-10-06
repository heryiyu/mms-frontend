// 會員審核（區長以上）：待審核數量／清單、批次通過、單筆退回
import { http, HttpResponse } from 'msw'
import type { ApproveRequest, ApproveResponse, PendingMember } from '../../api/types'
import { db, orgNames } from '../db'
import type { MockUser } from '../db'
import { api, errorResponse, mockDelay, noContent, readBody, requireUser } from '../utils'

const pendingUsers = () => db.users.filter((u) => u.status === 'PENDING')

function toPendingMember(user: MockUser): PendingMember {
  return {
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    gender: user.gender,
    email: user.email,
    phone: user.phone,
    ...orgNames(user),
    journey: user.journey,
    submittedAt: user.submittedAt,
  }
}

export const reviewHandlers = [
  http.get(api('/members/pending/count'), async ({ request }) => {
    await mockDelay()
    requireUser(request, 'leader')
    return HttpResponse.json({ count: pendingUsers().length })
  }),

  http.get(api('/members/pending'), async ({ request }) => {
    await mockDelay()
    requireUser(request, 'leader')
    const list = pendingUsers().sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
    return HttpResponse.json(list.map(toPendingMember))
  }),

  http.post(api('/members/approve'), async ({ request }) => {
    await mockDelay()
    requireUser(request, 'leader')
    const { ids } = await readBody<ApproveRequest>(request, ['ids'])
    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse('VALIDATION_ERROR', '請至少選擇一筆', { ids: '請至少選擇一筆' })
    }

    const res: ApproveResponse = { approved: 0, failedIds: [] }
    for (const id of ids) {
      const user = pendingUsers().find((u) => u.id === id)
      if (!user) {
        res.failedIds.push(id)
        continue
      }
      user.status = 'ACTIVE'
      user.reviewedAt = new Date().toISOString()
      res.approved += 1
    }
    return HttpResponse.json(res)
  }),

  http.post(api('/members/:id/reject'), async ({ request, params }) => {
    await mockDelay()
    requireUser(request, 'leader')
    const user = db.users.find((u) => u.id === params.id)
    if (!user) return errorResponse('MEMBER_NOT_FOUND')
    if (user.status !== 'PENDING') return errorResponse('ALREADY_PROCESSED')
    user.status = 'REJECTED'
    user.reviewedAt = new Date().toISOString()
    return noContent()
  }),
]
