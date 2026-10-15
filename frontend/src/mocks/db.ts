// MSW 假資料：全部存在記憶體，審核／退回／個人資料修改會即時反映，重新整理頁面後還原。
// 這裡的帳號、密碼都是測試用假資料，說明見 src/mocks/README.md。
import type { Gender, Journey, Option, ProfileChangeRequest, Role } from '../api/types'

/* ---------- 教會組織：教會 → 牧區 → 小組 → EKK ---------- */

interface OrgTree {
  name: string
  districts: {
    name: string
    groups: { name: string; ekks: string[] }[]
  }[]
}

const ORG_TREE: OrgTree[] = [
  {
    name: '台北仁愛堂',
    districts: [
      {
        name: '新烏87',
        groups: [
          { name: 'Jessus', ekks: ['Hooo', 'Amen'] },
          { name: 'Grace', ekks: ['Faith', 'Hope'] },
        ],
      },
      {
        name: '新屋87',
        groups: [
          { name: 'Joshua', ekks: ['Caleb', 'Barnabas'] },
          { name: 'Esther', ekks: ['Ruth', 'Naomi'] },
        ],
      },
    ],
  },
  {
    name: '新北板橋堂',
    districts: [
      {
        name: '板橋一區',
        groups: [
          { name: 'Peter', ekks: ['Andrew', 'John'] },
          { name: 'Paul', ekks: ['Silas', 'Timothy'] },
        ],
      },
      { name: '板橋二區', groups: [{ name: 'Mary', ekks: ['Martha', 'Lydia'] }] },
    ],
  },
  {
    name: '桃園中壢堂',
    districts: [
      {
        name: '中壢一區',
        groups: [
          { name: 'David', ekks: ['Jonathan', 'Samuel'] },
          { name: 'Daniel', ekks: ['Shadrach', 'Abednego'] },
        ],
      },
      { name: '內壢區', groups: [{ name: 'Isaac', ekks: ['Jacob', 'Joseph'] }] },
    ],
  },
]

export const churches: Option[] = []
export const districts: (Option & { churchId: string })[] = []
export const groups: (Option & { districtId: string })[] = []
export const ekks: (Option & { groupId: string })[] = []

ORG_TREE.forEach((church, ci) => {
  const churchId = `c${ci + 1}`
  churches.push({ id: churchId, name: church.name })
  church.districts.forEach((district, di) => {
    const districtId = `${churchId}-d${di + 1}`
    districts.push({ id: districtId, name: district.name, churchId })
    district.groups.forEach((group, gi) => {
      const groupId = `${districtId}-g${gi + 1}`
      groups.push({ id: groupId, name: group.name, districtId })
      group.ekks.forEach((ekk, ei) => {
        ekks.push({ id: `${groupId}-e${ei + 1}`, name: ekk, groupId })
      })
    })
  })
})

export const journeys: { id: Journey; name: string }[] = [
  { id: 'NF', name: 'NF' },
  { id: 'VIP', name: 'VIP' },
  { id: 'XN', name: 'XN' },
]

const nameOf = (list: Option[], id: string) => list.find((item) => item.id === id)?.name ?? ''

/* ---------- 使用者 ---------- */

export type UserStatus = 'ACTIVE' | 'PENDING' | 'LOCKED' | 'REJECTED'

export interface MockUser {
  id: string
  /** 空字串 = 沒有（email、手機至少有一個，D5） */
  email: string
  /** 空字串 = 沒有密碼（只用 Line／Google 登入，#49 不顯示修改密碼） */
  password: string
  /** 空字串 = 沒有 */
  phone: string
  name: string
  nickname: string
  gender: Gender
  /** 明碼，只在 db 內；對外一律遮罩 */
  idNumber: string
  churchId: string
  districtId: string
  groupId: string
  ekkId: string
  journey: Journey
  role: Role
  status: UserStatus
  /** ISO 8601 */
  submittedAt: string
  reviewedAt?: string
  /** YYYY-MM-DD；種子資料大多沒有，會員資料申請（#48）送出時寫入 */
  birthDate?: string
  guardianName?: string
  /** 退回原因（#48 D10） */
  rejectReason?: string
}

type SeedUser = Omit<MockUser, 'churchId' | 'districtId' | 'groupId'>

/** 由 ekkId（如 c1-d1-g1-e1）反推上層 id，省得每個種子都寫四個欄位 */
export function seed(user: SeedUser): MockUser {
  const [c, d, g] = user.ekkId.split('-')
  return { ...user, churchId: c, districtId: `${c}-${d}`, groupId: `${c}-${d}-${g}` }
}

const AT = (day: number) => `2026-09-${String(day).padStart(2, '0')}T09:00:00.000Z`

export const db = {
  users: [
    // 一般會員（測試登入用）
    seed({
      id: 'u1',
      email: 'member@test.com',
      password: 'Member@123',
      phone: '0912345678',
      name: '林大頭',
      nickname: '彼得的魚',
      gender: 'male',
      idNumber: 'Q123456789',
      ekkId: 'c1-d1-g1-e1',
      journey: 'XN',
      role: 'member',
      status: 'ACTIVE',
      submittedAt: AT(1),
      reviewedAt: AT(2),
    }),
    // 區長以上（可使用會員審核）
    seed({
      id: 'u2',
      email: 'leader@test.com',
      password: 'Leader@123',
      phone: '0923456789',
      name: '陳約書亞',
      nickname: '約書亞',
      gender: 'male',
      idNumber: 'F234567890',
      ekkId: 'c1-d1-g2-e1',
      journey: 'VIP',
      role: 'leader',
      status: 'ACTIVE',
      submittedAt: AT(1),
      reviewedAt: AT(2),
    }),
    // 已鎖定帳號：登入一律回 ACCOUNT_LOCKED
    seed({
      id: 'u3',
      email: 'locked@test.com',
      password: 'Locked@123',
      phone: '0934567890',
      name: '黃鎖定',
      nickname: '鎖定',
      gender: 'female',
      idNumber: 'A223456781',
      ekkId: 'c1-d2-g1-e1',
      journey: 'NF',
      role: 'member',
      status: 'LOCKED',
      submittedAt: AT(1),
      reviewedAt: AT(2),
    }),
    // 待審核帳號：登入回 ACCOUNT_PENDING，同時會出現在會員審核清單；被核准後即可用 Pending@123 登入
    seed({
      id: 'u4',
      email: 'pending@test.com',
      password: 'Pending@123',
      phone: '0945678901',
      name: '王待審',
      nickname: '小待審',
      gender: 'male',
      idNumber: 'B123456780',
      ekkId: 'c1-d2-g2-e1',
      journey: 'XN',
      role: 'member',
      status: 'PENDING',
      submittedAt: AT(20),
    }),
    // 另外兩位待審核（加上 pending@test.com 共 3 位，對應設計稿首頁徽章 3）
    seed({
      id: 'u5',
      email: 'apply1@test.com',
      password: 'Apply1@123',
      phone: '0956789012',
      name: '李小美',
      nickname: '美美',
      gender: 'female',
      idNumber: 'C223456782',
      ekkId: 'c2-d1-g1-e1',
      journey: 'NF',
      role: 'member',
      status: 'PENDING',
      submittedAt: AT(21),
    }),
    seed({
      id: 'u6',
      email: 'apply2@test.com',
      password: 'Apply2@123',
      phone: '0967890123',
      name: '張以諾',
      nickname: '以諾',
      gender: 'male',
      idNumber: 'D123456783',
      ekkId: 'c3-d1-g1-e2',
      journey: 'VIP',
      role: 'member',
      status: 'PENDING',
      submittedAt: AT(22),
    }),
    // 申請被退回（附退回原因）：本機登入回 ACCOUNT_REJECTED；Logto 模式（?mockLogto=rejected@test.com）可修改後重新送出
    seed({
      id: 'u7',
      email: 'rejected@test.com',
      password: 'Rejected@123',
      phone: '0978901234',
      name: '吳退回',
      nickname: '小吳',
      gender: 'female',
      idNumber: 'H223456784',
      ekkId: 'c2-d2-g1-e1',
      journey: 'NF',
      role: 'member',
      status: 'REJECTED',
      submittedAt: AT(18),
      reviewedAt: AT(19),
      birthDate: '1995-03-15',
      rejectReason: '小組與 EKK 填寫有誤，請確認後重新送出',
    }),
    // 只用 Google 登入（#49）：沒有密碼、沒有手機。看不到「修改密碼」，可在個人資訊新增手機
    seed({
      id: 'u8',
      email: 'google@test.com',
      password: '',
      phone: '',
      name: '周恩典',
      nickname: '恩典',
      gender: 'female',
      idNumber: 'E223456785',
      ekkId: 'c1-d2-g2-e2',
      journey: 'VIP',
      role: 'member',
      status: 'ACTIVE',
      submittedAt: AT(3),
      reviewedAt: AT(4),
    }),
  ] as MockUser[],
  /** 註冊 OTP 驗證通過後發的憑證 → 驗證過的信箱 */
  registerTokens: new Map<string, string>(),
  /** 忘記密碼 OTP 驗證通過後發的憑證 → 使用者 id */
  resetTokens: new Map<string, string>(),
  /** 個人資料修改：已送出、等待 OTP 驗證的內容（使用者 id → 內容） */
  profileChanges: new Map<string, ProfileChangeRequest>(),
  nextUserId: 100,
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const findUserByEmail = (email: string) =>
  normalizeEmail(email) ? db.users.find((user) => user.email.toLowerCase() === normalizeEmail(email)) : undefined

/**
 * 已經被某個 SSO 帳號使用、但沒有會員資料的 email／手機（#49）：個人資訊改成這兩個會回 CONTACT_IN_USE。
 * 其他會員的 email／手機（例如 leader@test.com）也一樣會被擋。
 */
export const SSO_TAKEN_CONTACTS = { email: 'taken@test.com', phone: '0900111222' } as const

/** 由 /me 與審核清單使用，把 ekk/group/district/church id 轉成顯示名稱 */
export function orgNames(user: MockUser) {
  return {
    church: nameOf(churches, user.churchId),
    district: nameOf(districts, user.districtId),
    group: nameOf(groups, user.groupId),
    ekk: nameOf(ekks, user.ekkId),
  }
}

/** Q123456789 → Q12*****89 */
export function maskIdNumber(idNumber: string) {
  return `${idNumber.slice(0, 3)}${'*'.repeat(Math.max(idNumber.length - 5, 0))}${idNumber.slice(-2)}`
}

export function newUserId() {
  db.nextUserId += 1
  return `u${db.nextUserId}`
}
