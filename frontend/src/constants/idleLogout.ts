// 閒置自動登出（#11）設定值的唯一來源。
// 設計師註記：「超過 7 分鐘沒有任何行為自動登出」（docs/design/member-home/README.md）。
// 開發測試可在 .env.local 設 VITE_IDLE_LOGOUT_MINUTES（可用小數，例：0.1 = 6 秒），見 .env.example。

const DEFAULT_IDLE_LOGOUT_MINUTES = 7

function parseMinutes(raw: string | undefined): number {
  const minutes = Number(raw)
  return raw && Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_IDLE_LOGOUT_MINUTES
}

/** 閒置多久自動登出（毫秒） */
export const IDLE_LOGOUT_MS = parseMinutes(import.meta.env.VITE_IDLE_LOGOUT_MINUTES) * 60_000

/**
 * 操作時間寫入 localStorage（跨分頁同步）的最短間隔，避免每次 mousemove 都寫 storage。
 * 閒置時間調得很短（開發測試）時跟著縮短，確保同步誤差遠小於閒置時間。
 */
export const IDLE_ACTIVITY_SYNC_MS = Math.min(5_000, IDLE_LOGOUT_MS / 4)
