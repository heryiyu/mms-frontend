// 會員審核（區長以上）：待審核數量／清單、批次通過、單筆退回
import { http, HttpResponse } from 'msw'
import type { ApproveRequest, ApproveResponse, PendingMember, RejectRequest } from '../../api/types'
import { db, ekks, orgNames, seed } from '../db'
import type { MockUser } from '../db'
import { api, errorResponse, mockDelay, noContent, readBody, requireUser } from '../utils'

/*
 * 待審核清單情境切換（見 src/mocks/README.md「會員審核」）：
 * 在頁面網址加 ?mockReview=empty | many | default，設定會存在 sessionStorage，站內換頁後仍有效。
 * - empty：清單與數量一律為空（測空狀態）
 * - many：另外加入 12 位待審核申請者（測長清單捲動、全選）
 * - default：還原為種子資料的 3 位
 */
type ReviewScenario = 'default' | 'empty' | 'many'

const SCENARIO_PARAM = 'mockReview'
const SCENARIO_STORAGE_KEY = 'nlc_mms_mock_review'
const SCENARIOS: ReviewScenario[] = ['default', 'empty', 'many']

function reviewScenario(): ReviewScenario {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(SCENARIO_PARAM) as ReviewScenario | null
    if (fromUrl && SCENARIOS.includes(fromUrl)) sessionStorage.setItem(SCENARIO_STORAGE_KEY, fromUrl)
    const stored = sessionStorage.getItem(SCENARIO_STORAGE_KEY) as ReviewScenario | null
    return stored && SCENARIOS.includes(stored) ? stored : 'default'
  } catch {
    return 'default'
  }
}

const EXTRA_NAMES = ['周大衛', '吳路得', '鄭但以理', '王撒拉', '林提摩太', '陳以斯帖', '黃約拿', '許馬利亞', '蔡雅各', '曾拿俄米', '謝西拉', '何百基拉']
const JOURNEYS = ['NF', 'VIP', 'XN'] as const

/** many 情境：第一次用到時加入 12 位待審核（id 以 review-extra- 開頭），之後跟其他資料一樣可審核／退回 */
function ensureExtraApplicants() {
  if (db.users.some((u) => u.id.startsWith('review-extra-'))) return
  EXTRA_NAMES.forEach((name, i) => {
    const n = String(i + 1).padStart(2, '0')
    db.users.push(
      seed({
        id: `review-extra-${n}`,
        email: `extra${n}@test.com`,
        password: `Extra${n}@123`,
        phone: `09880000${n}`,
        name,
        nickname: `${name.slice(-2)}${n}`,
        gender: i % 2 === 0 ? 'male' : 'female',
        idNumber: `E1000000${n}`,
        ekkId: ekks[i % ekks.length].id,
        journey: JOURNEYS[i % JOURNEYS.length],
        role: 'member',
        status: 'PENDING',
        submittedAt: `2026-09-${String(23 + (i % 7)).padStart(2, '0')}T09:00:00.000Z`,
      }),
    )
  })
}

const pendingUsers = () => {
  const scenario = reviewScenario()
  if (scenario === 'empty') return []
  if (scenario === 'many') ensureExtraApplicants()
  const pending = db.users.filter((u) => u.status === 'PENDING')
  return scenario === 'many' ? pending : pending.filter((u) => !u.id.startsWith('review-extra-'))
}

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
    // 退回原因必填（#48 D10），會顯示給申請者
    const { reason } = await readBody<RejectRequest>(request, ['reason'])
    if (!reason.trim()) return errorResponse('VALIDATION_ERROR', '請輸入退回原因', { reason: '必填' })
    const user = db.users.find((u) => u.id === params.id)
    if (!user) return errorResponse('MEMBER_NOT_FOUND')
    if (user.status !== 'PENDING') return errorResponse('ALREADY_PROCESSED')
    user.status = 'REJECTED'
    user.reviewedAt = new Date().toISOString()
    user.rejectReason = reason.trim()
    return noContent()
  }),
]
