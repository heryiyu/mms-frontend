// SSO 登入頁（#47）呼叫 Logto Experience API 的共用入口。
// 這包網頁和 Logto 同網域（上線靠 Cloudflare 分流，開發靠 vite.sso.config.ts 的 proxy），
// 進行中的登入（interaction）記在 Logto 的 cookie 裡，所以不帶 token、一律同網域相對路徑。
// 不要 import 會員中心的 src/api/client.ts（它會連帶打包 Logto SDK 與會員中心的登入狀態）。

export class ExperienceError extends Error {
  /** HTTP status；連線失敗時為 0 */
  status: number
  /** Logto 錯誤碼，例如 session.invalid_credentials；連線失敗為 network_error，沒有 code 時為 unknown */
  code: string
  /** Logto 回應的 data 欄位（部分錯誤附帶細節，例如 user.missing_profile 的 missingProfile） */
  data: unknown

  constructor(status: number, code: string, message: string, data?: unknown) {
    super(message)
    this.name = 'ExperienceError'
    this.status = status
    this.code = code
    this.data = data
  }
}

/** 判斷是否為 ExperienceError，可指定一個或多個錯誤碼 */
export function isExperienceError(error: unknown, ...codes: string[]): error is ExperienceError {
  return error instanceof ExperienceError && (codes.length === 0 || codes.includes(error.code))
}

interface LogtoErrorBody {
  code?: unknown
  message?: unknown
  data?: unknown
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ExperienceError(0, 'network_error', '網路連線異常，請稍後再試')
  }

  const data: unknown = res.status === 204 ? undefined : await res.json().catch(() => undefined)

  if (!res.ok) {
    const parsed = (typeof data === 'object' && data !== null ? data : {}) as LogtoErrorBody
    throw new ExperienceError(
      res.status,
      typeof parsed.code === 'string' ? parsed.code : 'unknown',
      typeof parsed.message === 'string' ? parsed.message : `HTTP ${res.status}`,
      parsed.data,
    )
  }
  return data as T
}
