// 通行密鑰（Passkey，#63）的流程：登入頁按鈕／帳號欄位自動填入（usePasskeySignIn）、登入或註冊完成前詢問建立（components/PasskeySetup）。
// 做法照 Logto 預設登入頁（packages/experience 的 use-passkey-sign-in、PasskeySetup），呼叫順序見 src/sso/README.md「通行密鑰」。
import { ExperienceError, isExperienceError } from './api/client'
import {
  bindPasskey,
  createWebAuthnRegistration,
  getSignInExperience,
  identify,
  initInteraction,
  type PasskeySignInSettings,
  preflightPasskeySignIn,
  skipPasskeyBinding,
  submitInteraction,
  verifyPasskeySignIn,
  verifyWebAuthnRegistration,
} from './api/experience'
import { isWebAuthnSupported, toCreationOptions, toRequestOptions, toWebAuthnPayload } from './webauthn'

/* ---------- 設定 ---------- */

let settingsPromise: Promise<Required<PasskeySignInSettings>> | null = null

/**
 * Logto 後台的通行密鑰登入設定（同一頁只查一次）。查不到（網路錯誤等）當作全關，登入頁照常可用密碼登入。
 * 瀏覽器不支援 WebAuthn 時也當作全關。
 */
export function loadPasskeySettings(): Promise<Required<PasskeySignInSettings>> {
  settingsPromise ??= (async () => {
    const off = { enabled: false, showPasskeyButton: false, allowAutofill: false }
    if (!isWebAuthnSupported()) return off
    try {
      const { passkeySignIn } = await getSignInExperience()
      const enabled = passkeySignIn?.enabled === true
      return {
        enabled,
        showPasskeyButton: enabled && passkeySignIn?.showPasskeyButton === true,
        allowAutofill: enabled && passkeySignIn?.allowAutofill === true,
      }
    } catch {
      settingsPromise = null // 下次再查
      return off
    }
  })()
  return settingsPromise
}

/* ---------- 登入 ---------- */

/** 取得登入用 options（navigator.credentials.get 的 publicKey）。按鈕與自動填入共用同一份，用過一次就重新取 */
export async function getPasskeyRequestOptions(): Promise<PublicKeyCredentialRequestOptions> {
  const { authenticationOptions } = await preflightPasskeySignIn()
  // 同 Logto 預設登入頁：preflight 是給「可被發現的」通行密鑰用，不限定 credential（使用者在系統視窗選帳號）
  return { ...toRequestOptions(authenticationOptions), allowCredentials: [] }
}

/**
 * 使用者選好通行密鑰後：initInteraction(SignIn) → verify → identify → submit，回傳要轉去的網址（交給 goToRedirect）。
 * initInteraction 放在取得 credential 之後（同 Logto 預設登入頁）：preflight 的 challenge 存在 interaction 的另一欄，
 * initInteraction 不會清掉；而頁面載入時就要 preflight 給自動填入用，那時還不能確定使用者要用哪種方式登入。
 * Logto 找不到這個 credential 對應的帳號（session.identifier_not_found）轉成 passkey_not_found，提示改用其他方式。
 */
export async function completePasskeySignIn(credential: PublicKeyCredential): Promise<string> {
  await initInteraction('SignIn')
  let verificationId: string
  try {
    ;({ verificationId } = await verifyPasskeySignIn(toWebAuthnPayload(credential)))
  } catch (error) {
    if (isExperienceError(error, 'session.identifier_not_found')) {
      throw new ExperienceError(error.status, 'passkey_not_found', error.message)
    }
    throw error
  }
  await identify(verificationId)
  const { redirectTo } = await submitInteraction()
  return redirectTo
}

/* ---------- 建立（登入、註冊完成前詢問） ---------- */

/**
 * submit 回這個錯誤：Logto 開了通行密鑰登入，這個帳號還沒有通行密鑰也沒略過過，要詢問是否建立（components/PasskeySetup）。
 * 註冊、密碼登入、社群登入的 submit 都可能回這個碼（Logto 只對企業 SSO 登入不問）。
 */
export const isPasskeyPreferred = (error: unknown) => isExperienceError(error, 'user.passkey_preferred')

export interface PasskeyRegistration {
  verificationId: string
  options: PublicKeyCredentialCreationOptions
}

/**
 * 建立通行密鑰第一步：先向 Logto 取得 options。詢問畫面一出現就先取，按下「建立」時才能直接叫出系統視窗
 * （Safari 要求 navigator.credentials.create 緊接在使用者點擊之後，中間不能先等 API）。
 */
export async function preparePasskeyRegistration(): Promise<PasskeyRegistration> {
  const { verificationId, registrationOptions } = await createWebAuthnRegistration()
  return { verificationId, options: toCreationOptions(registrationOptions) }
}

/** 建立通行密鑰第二步（使用者完成系統視窗後）：驗證 → 綁到帳號 → submit，回傳要轉去的網址 */
export async function bindPasskeyAndSubmit(verificationId: string, credential: PublicKeyCredential): Promise<string> {
  await verifyWebAuthnRegistration(verificationId, toWebAuthnPayload(credential))
  await bindPasskey(verificationId)
  const { redirectTo } = await submitInteraction()
  return redirectTo
}

/** 略過建立 → submit，回傳要轉去的網址。瀏覽器不支援 WebAuthn 時也走這裡（不詢問） */
export async function skipPasskeyAndSubmit(): Promise<string> {
  await skipPasskeyBinding()
  const { redirectTo } = await submitInteraction()
  return redirectTo
}
