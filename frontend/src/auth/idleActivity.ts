// 閒置自動登出（#11）：跨分頁共用的「最後操作時間」。
// - 存在 localStorage，任一分頁有操作就寫入，其他分頁透過 storage 事件得知，因此一個分頁有操作、其他分頁不會登出。
// - 重新整理或關掉瀏覽器再開（「記住帳號」）時沿用既有時間，已閒置超過時限會立刻自動登出，不會因重新載入而重新計時。
// - 登入時重設、登出時移除（下方 authStore 訂閱），避免上一次登入殘留的舊時間讓新登入立刻被登出。
//   這段訂閱是模組層級的副作用：本檔經 MemberLayout → routes 在 App 啟動時就載入，登入頁也能收到。
import { authStore } from './store'

const STORAGE_KEY = 'nlc_mms_last_activity'

/** 讀取共用的最後操作時間；沒有或讀取失敗回 null */
export function readLastActivity(): number | null {
  try {
    return parseLastActivity(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

export function parseLastActivity(raw: string | null): number | null {
  const value = Number(raw)
  return raw && Number.isFinite(value) && value > 0 ? value : null
}

export function writeLastActivity(at: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(at))
  } catch {
    // storage 不可用時只剩本分頁計時，跨分頁同步失效
  }
}

export function clearLastActivity() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 忽略
  }
}

/** storage 事件是否為最後操作時間的變更 */
export function isLastActivityKey(key: string | null): boolean {
  return key === STORAGE_KEY
}

let wasLoggedIn = authStore.getSession() !== null
authStore.subscribe(() => {
  const loggedIn = authStore.getSession() !== null
  if (loggedIn && !wasLoggedIn) writeLastActivity(Date.now())
  if (!loggedIn && wasLoggedIn) clearLastActivity()
  wasLoggedIn = loggedIn
})
