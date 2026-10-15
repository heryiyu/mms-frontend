// 聯絡方式遮罩（#50 奉獻收據顯示會員已有的 email／手機；MSW 產生 sentTo 也用這支，格式同 #49）
// a.b@gmail.com → a***@gmail.com；0912345678 → 0912***678

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@')
  return `${local.slice(0, 1)}***@${domain}`
}

export function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`
}

export function maskContact(channel: 'email' | 'phone', value: string): string {
  return channel === 'email' ? maskEmail(value) : maskPhone(value)
}
