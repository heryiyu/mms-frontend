// 年齡判斷（註冊「未成年判斷」：未滿 18 歲需填監護人資料）

export const ADULT_AGE = 18

/** DatePicker 的 Dayjs 值也可直接傳入（有 toDate()） */
export type BirthDateInput = string | Date | { toDate: () => Date } | null | undefined

function toDate(value: BirthDateInput): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    // YYYY-MM-DD 以本地時區解析，避免 new Date('2008-01-01') 被當成 UTC
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value)
  }
  return value.toDate()
}

/** 出生日期到 today 是否未滿 18 歲；日期無效時回 false */
export function isMinor(birthDate: BirthDateInput, today: Date = new Date()): boolean {
  const birth = toDate(birthDate)
  if (!birth || Number.isNaN(birth.getTime())) return false
  const adultOn = new Date(birth.getFullYear() + ADULT_AGE, birth.getMonth(), birth.getDate())
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return adultOn.getTime() > startOfToday.getTime()
}
