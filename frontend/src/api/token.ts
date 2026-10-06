// 登入 token 的儲存抽象：勾選「記住帳號」存 localStorage（關閉瀏覽器仍保留），否則存 sessionStorage。
// 所有 storage 存取都包 try/catch（無痕模式、封鎖 Cookie 時可能丟例外），讀取失敗一律視為「沒有 token」。
const TOKEN_KEY = 'nlc_mms_token'

function read(storage: () => Storage): string | null {
  try {
    return storage().getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function write(storage: () => Storage, token: string) {
  try {
    storage().setItem(TOKEN_KEY, token)
  } catch {
    // storage 不可用時無法保存 token，使用者重新整理頁面後需要重新登入
  }
}

function remove(storage: () => Storage) {
  try {
    storage().removeItem(TOKEN_KEY)
  } catch {
    // 忽略
  }
}

const local = () => window.localStorage
const session = () => window.sessionStorage

export function getToken(): string | null {
  return read(session) ?? read(local)
}

export function setToken(token: string, remember: boolean) {
  // 先清掉另一邊，避免兩邊各存一份、登出時殘留
  if (remember) {
    remove(session)
    write(local, token)
  } else {
    remove(local)
    write(session, token)
  }
}

export function clearToken() {
  remove(session)
  remove(local)
}
