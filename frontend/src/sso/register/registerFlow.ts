// SSO 註冊（#56）的 Experience API 呼叫順序：
//   第一步 sendRegisterCode：initInteraction('Register') → sendVerificationCode
//   第一步 verifyRegisterCode：verifyCode → identify（檢查帳號是否已註冊；新帳號會回 user.missing_profile）
//   第二步 completeRegister：addProfile 密碼 → addProfile 姓名（extraProfile）→ identify（建立帳號）→ submitInteraction
// 教會、牧區等會員資料不在這裡填（第一次登入會員中心時填，#48）。
import { isExperienceError } from '../api/client'
import {
  addProfile,
  type Identifier,
  identify,
  initInteraction,
  sendVerificationCode,
  submitInteraction,
  verifyCode,
} from '../api/experience'
import { memberCenterUrl } from '../paths'

/**
 * 帳號條款、隱私權政策：連到會員中心（#47 D7）。Logto 後台的條款網址目前還是 member.newlife.org.tw/terms、/privacy。
 * TODO(#43)：會員中心上線網域待確認，會員中心也還沒有這兩頁（路徑先沿用 Logto 後台設定的 /terms、/privacy）。
 */
export const TERMS_URL = memberCenterUrl('/terms')
export const PRIVACY_URL = memberCenterUrl('/privacy')

/** 開始註冊並寄驗證碼。每次寄送（含重新發送）都重新開始 interaction，清掉上一次的驗證紀錄 */
export async function sendRegisterCode(identifier: Identifier): Promise<{ verificationId: string }> {
  await initInteraction('Register')
  return sendVerificationCode(identifier, 'Register')
}

/**
 * 驗證驗證碼，並先用 identify 檢查帳號能不能註冊：
 * - 已註冊：丟出 user.email_already_in_use／user.phone_already_in_use
 * - 新帳號：Logto 回 user.missing_profile（還沒設密碼、姓名），視為成功，回傳 needsProfile: true
 * - identify 直接成功（Logto 不要求其他資料，目前設定不會發生）：needsProfile: false，可直接 submitInteraction
 * TODO(#47)：未實測「identify 先檢查重複、再檢查缺資料」的順序，依 Logto 原始碼推測。
 */
export async function verifyRegisterCode(identifier: Identifier, verificationId: string, code: string) {
  const verified = await verifyCode(identifier, verificationId, code)
  try {
    await identify(verified.verificationId)
    return { verificationId: verified.verificationId, needsProfile: false }
  } catch (error) {
    if (isExperienceError(error, 'user.missing_profile')) {
      return { verificationId: verified.verificationId, needsProfile: true }
    }
    throw error
  }
}

export interface RegisterProfile {
  familyName: string
  givenName: string
  password: string
}

/**
 * Logto 必填自訂欄位 fullname（類型 Fullname，後台開了 givenName「名字」與 familyName「姓氏」，皆必填；
 * sign-in-exp 的 customProfileFields，2026-10-14 查）。
 *
 * TODO(#47)：送出格式未實測（要先驗證過帳號才能走到這一步，正式 SSO 不能測）。推測依據：
 * - OpenAPI 的 extraProfile.values 說明「會拆成標準 profile 屬性與自訂 customData」，Fullname 的各部分正好是
 *   Logto 標準 profile 的 givenName／familyName，所以先送平的 { givenName, familyName }
 * - 若 Logto 要的是以欄位名稱包起來的 { fullname: { givenName, familyName } }：平的格式會被 addProfile 拒絕（4xx），
 *   或被當成 customData 收下、identify 時仍回 user.missing_profile，兩種情況都改送這個格式再試一次
 * 第一次真的註冊成功後，到 SSO 後台確認使用者的 profile 有姓名，並把用不到的格式刪掉。
 */
type FullnameParts = Pick<RegisterProfile, 'givenName' | 'familyName'>
const FULLNAME_FORMATS: ((parts: FullnameParts) => Record<string, unknown>)[] = [
  (parts) => ({ ...parts }),
  (parts) => ({ fullname: parts }),
]

/** addProfile（姓名）被拒的原因可能是格式不對：4xx，且不是 interaction／驗證失效 */
const isProfileFormatError = (error: unknown) =>
  isExperienceError(error) && error.status >= 400 && error.status < 500 && !error.code.startsWith('session.')

/** 第二步：補密碼、姓名後建立帳號並完成 interaction，回傳要轉址的 redirectTo（交給 goToRedirect） */
export async function completeRegister(verificationId: string, profile: RegisterProfile | null) {
  if (profile) {
    await addProfile({ type: 'password', value: profile.password })
    const parts = { givenName: profile.givenName, familyName: profile.familyName }
    for (const [index, format] of FULLNAME_FORMATS.entries()) {
      const isLast = index === FULLNAME_FORMATS.length - 1
      try {
        await addProfile({ type: 'extraProfile', values: format(parts) })
      } catch (error) {
        if (isLast || !isProfileFormatError(error)) throw error
        continue
      }
      try {
        await identify(verificationId)
        break
      } catch (error) {
        if (isLast || !isExperienceError(error, 'user.missing_profile')) throw error
      }
    }
  }
  const { redirectTo } = await submitInteraction()
  return redirectTo
}
