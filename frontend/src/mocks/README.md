# Mock API（MSW）

後端尚未完成時，用 [MSW](https://mswjs.io) 在瀏覽器攔截 `/api/*` 請求並回傳假資料。API 契約見 [`backend/README.md`](../../../backend/README.md)，型別見 [`src/api/types.ts`](../api/types.ts)。

## 開關

- `npm run dev` 預設啟用；正式 build 不會載入 mock。
- 關閉：在 `frontend/.env.local` 設定 `VITE_USE_MOCK=false`，重啟 dev server，API 會走 vite proxy 打真實後端。
- 啟動邏輯在 `src/main.tsx` 的 `enableMocking()`；Service Worker 檔案是 `public/mockServiceWorker.js`（由 `npx msw init public/` 產生，請勿手改）。
- 資料全部存在記憶體（`db.ts`）：審核、退回、個人資料修改、修改密碼會即時反映，**重新整理頁面後還原**。
- 每支 API 會延遲 400–800ms，讓 loading 狀態看得到（`utils.ts` 的 `mockDelay`）。
- Claude 桌面版內建瀏覽器只對 `preview_start`（`.claude/launch.json`）啟動的 dev server 允許註冊 Service Worker；自行用指令另開的 vite（例如在 worktree 跑 `npx vite`）會出現 `Failed to register a ServiceWorker ... An unknown error occurred when fetching the script`，MSW 無法啟用、API 改打 proxy（502）。這是瀏覽器環境限制，不是專案設定問題；一般瀏覽器不受影響。

## 開發用切換登入身分

啟用 MSW 時，畫面左下角會出現切換按鈕（`DevRoleSwitcher.tsx`），可直接切成「未登入／一般會員／區長以上／等待審核」，不用經過登入頁；切換後 API 也會以該測試帳號身分回應。正式 build 不會包含。

## 測試帳號

以下皆為測試用假資料。

| 信箱 | 密碼 | 角色／狀態 | 用途 |
| --- | --- | --- | --- |
| `member@test.com` | `Member@123` | 一般會員（手機 `0912345678`） | 一般登入、個人資訊、修改密碼、奉獻收據 |
| `leader@test.com` | `Leader@123` | 區長以上（手機 `0923456789`） | 會員審核（首頁徽章 3、清單、通過、退回） |
| `locked@test.com` | 任意 | 已鎖定 | 登入 → `ACCOUNT_LOCKED` |
| `pending@test.com` | 任意（核准後用 `Pending@123`） | 待審核（手機 `0945678901`） | 登入 → `ACCOUNT_PENDING`（等待審核頁）；同時出現在審核清單 |
| `apply1@test.com`、`apply2@test.com` | `Apply1@123`、`Apply2@123` | 待審核 | 審核清單的另外兩筆；核准後可登入，被退回後登入 → `ACCOUNT_REJECTED` |

`member@test.com` 的身分證字號為 `Q123456789`（`/me` 回傳 `Q12*****89`）。

## 錯誤情境觸發方式

### 登入（`POST /auth/login`）

| 輸入 | 結果 |
| --- | --- |
| `notfound@test.com`（或任何未註冊信箱） | 404 `ACCOUNT_NOT_FOUND` |
| `member@test.com` + 錯誤密碼 | 400 `WRONG_PASSWORD` |
| `frequent@test.com` | 429 `TOO_MANY_ATTEMPTS`（登入過度頻繁） |
| `locked@test.com` | 423 `ACCOUNT_LOCKED` |
| `pending@test.com` | 403 `ACCOUNT_PENDING` |
| 被退回的 `apply2@test.com` | 403 `ACCOUNT_REJECTED` |

鎖定／待審核／被退回的帳號不檢查密碼。信箱不分大小寫。

### OTP（所有「發送 OTP」回 `{ expiresIn: 300, length: 4 }`）

| 輸入 | 結果 |
| --- | --- |
| OTP 填 `0000`（或不是 4 碼數字） | 400 `OTP_INVALID` |
| OTP 填 `9999` | 410 `OTP_EXPIRED` |
| 其他 4 碼數字（例如 `1234`、`7414`） | 通過 |
| 發送 OTP 時信箱填 `frequent@test.com` | 429 `TOO_MANY_ATTEMPTS`（註冊、忘記密碼、個資修改、收據都適用） |

### 註冊

- 發送 OTP：信箱或手機與現有帳號相同（例如 `member@test.com`、`0912345678`）→ 409 `ALREADY_REGISTERED`。
- 發送 OTP：生日未滿 18 歲且沒填 `guardianName` → 422 `VALIDATION_ERROR`。
- 發送 OTP：信箱／手機格式錯誤（手機需 `09` 開頭共 10 碼）→ 422 `VALIDATION_ERROR`。
- 送出註冊：身分證字號填 `Q123456789`（已存在）→ 409 `ALREADY_REGISTERED`；`registerToken` 錯誤或已用過 → 400 `TOKEN_INVALID`；教會／牧區／小組／EKK 不屬於同一條線 → 422。
- 註冊成功後該帳號為待審核：會出現在 `leader@test.com` 的審核清單，登入回 `ACCOUNT_PENDING`，進度查詢回 `PENDING`。

### 進度查詢（`POST /register/progress`）

信箱＋手機都要符合才查得到，否則 404 `ACCOUNT_NOT_FOUND`。

| 信箱 + 手機 | 結果 |
| --- | --- |
| `pending@test.com` + `0945678901` | `PENDING` |
| `member@test.com` + `0912345678` | `APPROVED` |
| 審核通過／退回後的 `apply1@test.com`（`0956789012`）、`apply2@test.com`（`0967890123`） | `APPROVED`／`REJECTED` |

### 忘記密碼

| 輸入 | 結果 |
| --- | --- |
| 未註冊信箱（如 `notfound@test.com`） | 404 `ACCOUNT_NOT_FOUND` |
| `member@test.com` + 不是 `0912345678` 的手機 | 400 `EMAIL_PHONE_MISMATCH` |
| 新密碼不符規則（見下） | 422 `VALIDATION_ERROR` |
| `resetToken` 錯誤或已用過 | 400 `TOKEN_INVALID` |

### 修改密碼（`PUT /me/password`）

- 目前密碼錯誤 → 400 `WRONG_CURRENT_PASSWORD`
- 新密碼與目前密碼相同 → 400 `PASSWORD_SAME_AS_OLD`
- 新密碼不符規則 → 422 `VALIDATION_ERROR`

### 個人資訊修改

- 新信箱／手機已被其他帳號使用（例如改成 `leader@test.com`）→ 409 `ALREADY_REGISTERED`
- 沒先送出修改內容就驗證 OTP → 410 `OTP_EXPIRED`

### 奉獻收據

- 信箱與手機必須等於登入會員自己的資料，否則 400 `EMAIL_PHONE_MISMATCH`（用 `member@test.com` + `0912345678` 測成功）。
- `year` 填 2020 以前（例如 `2019`）→ 404 `NO_RECORDS`；不帶 `year` 視為去年。

### 會員審核

- 一般會員呼叫審核 API → 403 `FORBIDDEN`。
- 對已通過／已退回的 id 再退回 → 409 `ALREADY_PROCESSED`；不存在的 id → 404 `MEMBER_NOT_FOUND`。
- 批次通過時不存在或已處理的 id 會列在回應的 `failedIds`。

### 登入失效（401）

沒有 token 或 token 無效時，需登入的 API 回 401 `UNAUTHORIZED`。測試方式：登入後到 DevTools 把 `sessionStorage`（或 `localStorage`）裡 `nlc_mms_auth` 的 `token` 改成任意字串，再操作任一頁面。token 格式為 `mock-token-<使用者 id>`，重新整理頁面不會失效。

### Line 登入（stub）

`GET /auth/line/url` 回傳指向本站 `/auth/line/callback?code=...&state=...` 的網址（不會真的離開網站）。`POST /auth/line/callback` 依 `code`：

| code | 結果 |
| --- | --- |
| `mock-line-code` | 登入 `member@test.com` |
| `mock-line-new` | `REGISTER_REQUIRED`（帶 `lineToken`，接註冊流程） |
| `mock-line-pending` | 403 `ACCOUNT_PENDING` |

## 暫定的密碼規則

設計未定義，mock 暫定：至少 8 碼，且同時包含英文與數字（註冊、重設、修改密碼共用）。規則集中在 `src/constants/password.ts`（前端表單驗證與 mock 的 `assertPassword` 共用），後端定案後只改那個檔案。

## 檔案結構

```
src/mocks/
  browser.ts          setupWorker
  db.ts               假資料與記憶體資料庫（教會組織、使用者）
  utils.ts            延遲、錯誤回應、token／OTP／欄位驗證
  DevRoleSwitcher.tsx 開發用切換登入身分
  handlers/
    index.ts          彙整所有 handler
    auth.ts           登入、登出、Line（登入成功回 { token, role, status: 'ACTIVE' }）
    register.ts       註冊、個資聲明、進度查詢
    password.ts       忘記密碼、修改密碼
    member.ts         /me、個人資訊修改
    options.ts        教會／牧區／小組／EKK／靈程
    receipt.ts        奉獻收據
    review.ts         會員審核
```

新增 API 時：在 `src/api/types.ts` 加型別、`src/api/*.ts` 加函式、`handlers/*.ts` 加對應 handler，並更新 `backend/README.md` 與本檔。
