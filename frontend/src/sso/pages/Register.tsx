import { useState } from 'react'
import { useGuestLayout } from '../../layouts/guestLayoutContext'
import AccountStep, { type VerifiedAccount } from '../register/AccountStep'
import ProfileStep from '../register/ProfileStep'

/**
 * SSO 註冊（#56）：帳號（email 或手機擇一）＋驗證碼 → 姓名、密碼、同意條款 → 建立帳號 → 回到原網站。
 * 兩個步驟都在 /register 同一個路徑內切換（Logto 只認得這個路徑）。呼叫順序見 register/registerFlow.ts。
 * 重新整理會回到第一步（驗證紀錄的 verificationId 只放在記憶體）。
 */
export default function Register() {
  useGuestLayout('card')
  const [account, setAccount] = useState<VerifiedAccount | null>(null)
  // 從第二步返回第一步時帶回原本輸入的帳號
  const [identifierInput, setIdentifierInput] = useState<string>()

  if (account) return <ProfileStep account={account} onBack={() => setAccount(null)} />

  return (
    <AccountStep
      initialIdentifier={identifierInput}
      onVerified={(verified, input) => {
        setIdentifierInput(input)
        setAccount(verified)
      }}
    />
  )
}
