import { useCallback, useEffect, useRef, useState } from 'react'
import { ExperienceError } from './api/client'
import { goToRedirect } from './api/experience'
import { completePasskeySignIn, getPasskeyRequestOptions, loadPasskeySettings } from './passkey'
import { usePageRestored } from './usePageRestored'
import { isConditionalMediationSupported, isWebAuthnAborted, isWebAuthnCancelled } from './webauthn'

interface UsePasskeySignInOptions {
  /** 伺服器或瀏覽器錯誤（使用者取消不會呼叫）；文字對照在 api/errors.ts */
  onError: (error: unknown) => void
}

/**
 * 登入頁的通行密鑰登入（#63）：「通過通行密鑰繼續」按鈕＋帳號欄位自動填入（帳號欄要有 autocomplete="username webauthn"）。
 * - 依 Logto 設定（sign-in-exp 的 passkeySignIn）決定顯示按鈕（showButton）、啟動自動填入；瀏覽器不支援 WebAuthn 時都不做
 * - 頁面載入就 preflight 取 options，按鈕與自動填入共用同一份（同 Logto 預設登入頁）；送去驗證過一次就重新取
 * - 同一時間只有一個 navigator.credentials.get：按下按鈕先中止自動填入，按鈕流程結束再重新啟動；離開頁面時中止
 * - 使用者取消（NotAllowedError）安靜回到原狀；選好通行密鑰後 verifying 為 true（頁面顯示 loading），成功轉址
 */
export function usePasskeySignIn({ onError }: UsePasskeySignInOptions) {
  const [showButton, setShowButton] = useState(false)
  const [buttonPending, setButtonPending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  /** 目前可用的 options（challenge 還沒送去驗證過） */
  const optionsRef = useRef<PublicKeyCredentialRequestOptions | null>(null)
  const fetchingRef = useRef<Promise<PublicKeyCredentialRequestOptions> | null>(null)
  const autofillRef = useRef<AbortController | null>(null)
  const allowAutofillRef = useRef(false)
  const busyRef = useRef(false)

  // Logto 只記得最後一次 preflight 的 challenge：同時只能有一個請求，按鈕與自動填入共用結果
  const fetchOptions = useCallback(() => {
    if (optionsRef.current) return Promise.resolve(optionsRef.current)
    fetchingRef.current ??= getPasskeyRequestOptions()
      .then((options) => (optionsRef.current = options))
      .finally(() => {
        fetchingRef.current = null
      })
    return fetchingRef.current
  }, [])

  const abortAutofill = useCallback(() => {
    autofillRef.current?.abort()
    autofillRef.current = null
  }, [])

  /** 不再使用自動填入（例如改顯示「建立通行密鑰」詢問畫面，避免和 navigator.credentials.create 衝突） */
  const stopAutofill = useCallback(() => {
    allowAutofillRef.current = false
    abortAutofill()
  }, [abortAutofill])

  /** 送去驗證；成功轉址（維持 loading）回 true */
  const verify = useCallback(async (credential: PublicKeyCredential) => {
    optionsRef.current = null
    setVerifying(true)
    try {
      goToRedirect(await completePasskeySignIn(credential))
      return true
    } catch (error) {
      setVerifying(false)
      onErrorRef.current(error)
      return false
    }
  }, [])

  // 自動填入：使用者在帳號欄位的建議清單選了通行密鑰，get 才會回來；驗證失敗就用新的 options 再等下一次
  const startAutofill = useCallback(async () => {
    while (allowAutofillRef.current && !busyRef.current && !autofillRef.current) {
      const controller = new AbortController()
      autofillRef.current = controller
      let credential: Credential | null
      try {
        if (!(await isConditionalMediationSupported())) return
        const publicKey = await fetchOptions()
        if (controller.signal.aborted) return
        credential = await navigator.credentials.get({ mediation: 'conditional', publicKey, signal: controller.signal })
      } catch (error) {
        // 我們自己中止、使用者取消：不提示。取 options 失敗（例如 session.not_found）也不在載入時跳錯，按按鈕時才提示
        if (!isWebAuthnAborted(error) && !isWebAuthnCancelled(error) && import.meta.env.DEV) {
          console.warn('[passkey] 自動填入無法啟動', error)
        }
        return
      } finally {
        if (autofillRef.current === controller) autofillRef.current = null
      }
      if (!(credential instanceof PublicKeyCredential) || busyRef.current) return
      busyRef.current = true
      if (await verify(credential)) return
      busyRef.current = false
    }
  }, [fetchOptions, verify])

  useEffect(() => {
    let cancelled = false
    void loadPasskeySettings().then((settings) => {
      if (cancelled || !settings.enabled) return
      setShowButton(settings.showPasskeyButton)
      allowAutofillRef.current = settings.allowAutofill
      if (settings.allowAutofill) {
        void startAutofill()
      } else if (settings.showPasskeyButton) {
        // 先取好 options：按下按鈕時才能直接叫出系統視窗（Safari 要求緊接在點擊之後，中間不能先等 API）
        fetchOptions().catch(() => undefined)
      }
    })
    return () => {
      cancelled = true
      allowAutofillRef.current = false
      abortAutofill()
    }
  }, [abortAutofill, fetchOptions, startAutofill])

  /** 按下「通過通行密鑰繼續」 */
  const signInWithButton = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setButtonPending(true)
    abortAutofill()
    let credential: Credential | null = null
    try {
      // 已有 options 時不 await，直接叫出系統視窗
      const publicKey = optionsRef.current ?? (await fetchOptions())
      credential = await navigator.credentials.get({ publicKey })
    } catch (error) {
      if (!isWebAuthnCancelled(error) && !isWebAuthnAborted(error)) {
        // 伺服器錯誤照原樣；瀏覽器端的其他錯誤（例如網域不符的 SecurityError）轉成前端自訂碼
        onErrorRef.current(error instanceof ExperienceError ? error : new ExperienceError(0, 'passkey_failed', String(error)))
      }
    }
    setButtonPending(false)
    if (credential instanceof PublicKeyCredential && (await verify(credential))) return
    busyRef.current = false
    void startAutofill()
  }, [abortAutofill, fetchOptions, startAutofill, verify])

  // 通行密鑰登入成功轉址後按上一頁、由 bfcache 還原時：收起 loading，重新啟動自動填入
  usePageRestored(
    useCallback(() => {
      setVerifying(false)
      setButtonPending(false)
      busyRef.current = false
      void startAutofill()
    }, [startAutofill]),
  )

  return { showButton, buttonPending, verifying, signInWithButton, stopAutofill }
}
