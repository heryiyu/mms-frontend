// 瀏覽器 WebAuthn（Passkey／通行密鑰，#63）的小工具：支援判斷、options／credential 在 JSON 與 ArrayBuffer 之間轉換、錯誤分類。
// Logto 回的 options 與要送回的 credential 都是 WebAuthn 標準 JSON 格式（二進位欄位為 base64url，同 @simplewebauthn v10+）。
// 瀏覽器有 PublicKeyCredential.parse…FromJSON／toJSON() 就用，沒有（較舊的 Safari、Firefox）才自己轉，不另外引入套件。

/* ---------- 支援判斷 ---------- */

/** 瀏覽器支援 WebAuthn（不支援時不顯示通行密鑰按鈕、註冊後不詢問建立） */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential === 'function' &&
    typeof navigator.credentials?.get === 'function'
  )
}

/** 瀏覽器支援帳號欄位的通行密鑰自動填入（conditional mediation） */
export async function isConditionalMediationSupported(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false
  const check = (window.PublicKeyCredential as { isConditionalMediationAvailable?: () => Promise<boolean> })
    .isConditionalMediationAvailable
  if (typeof check !== 'function') return false
  try {
    return await check.call(window.PublicKeyCredential)
  } catch {
    return false
  }
}

/* ---------- 錯誤分類 ---------- */

const errorName = (error: unknown) =>
  typeof error === 'object' && error !== null && 'name' in error ? String((error as { name: unknown }).name) : ''

/**
 * 使用者取消（關掉系統的通行密鑰視窗、逾時）：瀏覽器一律丟 NotAllowedError，不跳錯、安靜回到原狀。
 * 注意：瀏覽器為了隱私，「找不到可用的通行密鑰」通常也是 NotAllowedError，無法和取消區分。
 */
export const isWebAuthnCancelled = (error: unknown) => errorName(error) === 'NotAllowedError'

/** 我們自己 abort 的請求（按下按鈕、離開頁面時中止自動填入） */
export const isWebAuthnAborted = (error: unknown) => errorName(error) === 'AbortError'

/** 建立通行密鑰時，這個裝置已經有同帳號的通行密鑰（excludeCredentials 命中） */
export const isWebAuthnAlreadyRegistered = (error: unknown) => errorName(error) === 'InvalidStateError'

/* ---------- base64url ---------- */

export function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export function bufferToBase64Url(buffer: ArrayBuffer | ArrayBufferView): string {
  const bytes =
    buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/* ---------- options：JSON → 瀏覽器格式 ---------- */

interface CredentialDescriptorJSON {
  type: string
  id: string
  transports?: string[]
}

/** Logto 回的登入 options（preflight／sign-in-passkey authentication 的 authenticationOptions） */
export interface AuthenticationOptionsJSON {
  challenge: string
  timeout?: number
  rpId?: string
  allowCredentials?: CredentialDescriptorJSON[]
  userVerification?: UserVerificationRequirement
  extensions?: Record<string, unknown>
}

/** Logto 回的建立 options（web-authn/registration 的 registrationOptions） */
export interface RegistrationOptionsJSON {
  rp: { name: string; id?: string }
  user: { id: string; name: string; displayName: string }
  challenge: string
  pubKeyCredParams: { type: string; alg: number }[]
  timeout?: number
  excludeCredentials?: CredentialDescriptorJSON[]
  authenticatorSelection?: AuthenticatorSelectionCriteria
  attestation?: AttestationConveyancePreference
  extensions?: Record<string, unknown>
}

type PublicKeyCredentialWithJSON = typeof PublicKeyCredential & {
  parseRequestOptionsFromJSON?: (options: unknown) => PublicKeyCredentialRequestOptions
  parseCreationOptionsFromJSON?: (options: unknown) => PublicKeyCredentialCreationOptions
}

const toDescriptor = ({ id, type, transports }: CredentialDescriptorJSON): PublicKeyCredentialDescriptor => ({
  id: base64UrlToBuffer(id),
  type: type as PublicKeyCredentialType,
  transports: transports as AuthenticatorTransport[] | undefined,
})

export function toRequestOptions(options: AuthenticationOptionsJSON): PublicKeyCredentialRequestOptions {
  const native = (window.PublicKeyCredential as PublicKeyCredentialWithJSON).parseRequestOptionsFromJSON
  if (typeof native === 'function') {
    try {
      return native.call(window.PublicKeyCredential, options)
    } catch {
      // 少數瀏覽器對未知欄位較嚴格，改用下面自己轉
    }
  }
  return {
    ...options,
    extensions: options.extensions as AuthenticationExtensionsClientInputs | undefined,
    challenge: base64UrlToBuffer(options.challenge),
    allowCredentials: options.allowCredentials?.map(toDescriptor),
  }
}

export function toCreationOptions(options: RegistrationOptionsJSON): PublicKeyCredentialCreationOptions {
  const native = (window.PublicKeyCredential as PublicKeyCredentialWithJSON).parseCreationOptionsFromJSON
  if (typeof native === 'function') {
    try {
      return native.call(window.PublicKeyCredential, options)
    } catch {
      // 同上
    }
  }
  return {
    ...options,
    extensions: options.extensions as AuthenticationExtensionsClientInputs | undefined,
    challenge: base64UrlToBuffer(options.challenge),
    user: { ...options.user, id: base64UrlToBuffer(options.user.id) },
    pubKeyCredParams: options.pubKeyCredParams as PublicKeyCredentialParameters[],
    excludeCredentials: options.excludeCredentials?.map(toDescriptor),
  }
}

/* ---------- credential：瀏覽器格式 → JSON ---------- */

/**
 * 送給 Logto 的 credential（verify 的 payload）。type 固定 'WebAuthn'（Logto 的 MfaFactor，不是瀏覽器的 'public-key'），
 * 其餘欄位同 WebAuthn 標準 JSON。
 */
export interface WebAuthnPayload {
  type: 'WebAuthn'
  id: string
  rawId: string
  authenticatorAttachment?: string
  clientExtensionResults: Record<string, unknown>
  response: Record<string, unknown>
}

type CredentialWithJSON = PublicKeyCredential & { toJSON?: () => Record<string, unknown> }

/** navigator.credentials.get／create 拿到的 credential 轉成 Logto verify 要的 payload */
export function toWebAuthnPayload(credential: PublicKeyCredential): WebAuthnPayload {
  const native = (credential as CredentialWithJSON).toJSON
  const json = typeof native === 'function' ? native.call(credential) : manualCredentialJSON(credential)
  const attachment = json.authenticatorAttachment
  return {
    id: String(json.id),
    rawId: String(json.rawId),
    // Logto 只接受 platform／cross-platform，其他值（null）不要送
    authenticatorAttachment: attachment === 'platform' || attachment === 'cross-platform' ? attachment : undefined,
    clientExtensionResults: (json.clientExtensionResults as Record<string, unknown> | undefined) ?? {},
    response: json.response as Record<string, unknown>,
    type: 'WebAuthn',
  }
}

function manualCredentialJSON(credential: PublicKeyCredential): Record<string, unknown> {
  const { response } = credential
  let responseJSON: Record<string, unknown>
  if ('attestationObject' in response) {
    // 建立（AuthenticatorAttestationResponse）
    const attestation = response as AuthenticatorAttestationResponse
    const publicKey = attestation.getPublicKey?.()
    responseJSON = {
      clientDataJSON: bufferToBase64Url(attestation.clientDataJSON),
      attestationObject: bufferToBase64Url(attestation.attestationObject),
      authenticatorData: attestation.getAuthenticatorData ? bufferToBase64Url(attestation.getAuthenticatorData()) : undefined,
      transports: attestation.getTransports?.(),
      publicKeyAlgorithm: attestation.getPublicKeyAlgorithm?.(),
      publicKey: publicKey ? bufferToBase64Url(publicKey) : undefined,
    }
  } else {
    // 登入（AuthenticatorAssertionResponse）
    const assertion = response as AuthenticatorAssertionResponse
    responseJSON = {
      clientDataJSON: bufferToBase64Url(assertion.clientDataJSON),
      authenticatorData: bufferToBase64Url(assertion.authenticatorData),
      signature: bufferToBase64Url(assertion.signature),
      userHandle: assertion.userHandle ? bufferToBase64Url(assertion.userHandle) : undefined,
    }
  }
  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: responseJSON,
  }
}
