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

## Logto 模式（#44）

`.env.local` 設定 `VITE_LOGTO_*`（見 `.env.example`）後，登入會轉址到真正的 Logto，API 仍由 MSW 回應：

- Logto 發的 access token（JWT）一律視為同一個 SSO 帳號（`utils.ts` 的 `mockSsoAccount`），再用它的 email／手機對應會員資料。預設信箱是 `.env.local` 的 `VITE_MOCK_LOGTO_EMAIL`（預設 `member@test.com`，改完要重啟 dev server）；也可以在網址加 `?mockLogto=<信箱>`（例如 `http://localhost:5173/?mockLogto=notfound@test.com`），設定存在 `sessionStorage`（`nlc_mms_mock_logto`），經過 SSO 轉址後仍有效，關閉分頁即還原。

  | 信箱 | SSO 帳號 | 登入後 |
  | --- | --- | --- |
  | `member@test.com`、`leader@test.com` 等種子帳號 | 該帳號的名字、email、手機 | 依帳號狀態：首頁、等待審核頁（`pending@test.com`）、帳號已鎖定（`locked@test.com`） |
  | `rejected@test.com` | 有 email、手機 | 申請被退回頁（附退回原因），「修改資料」帶入上次填的內容重新送出 |
  | `notfound@test.com`（或任何未註冊信箱） | 只有 email（名字「新朋友」） | 會員資料填寫流程，可補填手機 |
  | `phoneonly@test.com` | 只有手機 `0911000111` | 會員資料填寫流程，可補填 email |
  | `nocontact@test.com` | email、手機都沒有（Line、Google 註冊） | 會員資料填寫流程，至少要補一個 |

- 這個模式不顯示「切換登入身分」按鈕（token 由 Logto 發，切換不了）。
- Logto 只接受登記過的 redirect URI，請用 `npm run dev`（`http://localhost:5173`）測試；預覽工具的隨機埠會被 Logto 拒絕。

## 測試帳號

以下皆為測試用假資料。

| 信箱 | 密碼 | 角色／狀態 | 用途 |
| --- | --- | --- | --- |
| `member@test.com` | `Member@123` | 一般會員（手機 `0912345678`） | 一般登入、個人資訊、修改密碼、奉獻收據 |
| `leader@test.com` | `Leader@123` | 區長以上（手機 `0923456789`） | 會員審核（首頁徽章 3、清單、通過、退回） |
| `locked@test.com` | 任意 | 已鎖定 | 登入 → `ACCOUNT_LOCKED` |
| `pending@test.com` | 任意（核准後用 `Pending@123`） | 待審核（手機 `0945678901`） | 登入 → `ACCOUNT_PENDING`（等待審核頁）；同時出現在審核清單 |
| `apply1@test.com`、`apply2@test.com` | `Apply1@123`、`Apply2@123` | 待審核 | 審核清單的另外兩筆；核准後可登入，被退回後登入 → `ACCOUNT_REJECTED` |
| `rejected@test.com` | 任意 | 申請被退回（手機 `0978901234`，附退回原因） | 本機登入 → `ACCOUNT_REJECTED`；Logto 模式測修改後重新送出 |

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
| `rejected@test.com`（或被退回的 `apply2@test.com`） | 403 `ACCOUNT_REJECTED` |
| `error@test.com` | 500 且無錯誤碼（測通用錯誤文案） |

鎖定／待審核／被退回的帳號與上表的觸發信箱都不檢查密碼。信箱不分大小寫、前後空白會忽略。

登入頁（`pages/login/Login.tsx`）對應的畫面：

| 情境 | 畫面 |
| --- | --- |
| `notfound@test.com` | 通知彈窗「查無此帳號」 |
| `member@test.com` + 錯誤密碼 | 通知彈窗「密碼輸入錯誤」；連錯 3 次改為「登入過度頻繁」並暫停 5 分鐘，暫停累計 3 次帳號鎖定（計數存記憶體，重新整理可重置） |
| `frequent@test.com` | 通知彈窗「登入過度頻繁／請稍後登入」；之後 5 分鐘內前端直接擋下送出（任何信箱都會跳同一彈窗，重新整理頁面可解除） |
| `locked@test.com` | 通知彈窗「登入過度頻繁／帳號已鎖定／請聯繫（教會 Email）」 |
| `pending@test.com` | 導向等待審核頁（`/pending`），「返回」回登入頁 |
| `rejected@test.com` | 通知彈窗「申請未通過審核／請聯繫（教會 Email）」（設計未畫，暫定） |
| `error@test.com` | 通知彈窗「登入失敗，請稍後再試」 |
| 信箱格式錯誤（例如 `abc`） | 欄位下方 inline 錯誤「電子信箱格式錯誤」，不會呼叫 API |
| `member@test.com` + `Member@123` | 登入成功回首頁；勾「記住帳號」存 localStorage，否則存 sessionStorage |

每次登入 API 延遲 400–800ms，期間會看到 Logo loading 遮罩；連點「登入」或連按 Enter 只會送出一次。

### OTP（所有「發送 OTP」回 `{ expiresIn: 300, length: 4 }`）

| 輸入 | 結果 |
| --- | --- |
| OTP 填 `0000`（或不是 4 碼數字） | 400 `OTP_INVALID` |
| OTP 填 `9999` | 410 `OTP_EXPIRED` |
| 其他 4 碼數字（例如 `1234`、`7414`） | 通過 |
| 發送 OTP 時信箱填 `frequent@test.com` | 429 `TOO_MANY_ATTEMPTS`（註冊、忘記密碼、個資修改、收據都適用） |

OTP 元件示範：dev 模式開 `/dev/otp`（`PATHS.devOtp`，`OtpDemo.tsx`；正式 build 不會註冊這個路由）。
- 「單獨使用」不打 API：可切換位數（4／5／6）、倒數（10 秒／1 分／5 分）、錯誤與停用狀態，測輸入、貼上整串簡訊（含全形數字）、倒數歸零後「重新發送」。
- 「AppForm＋MSW」用忘記密碼 API（`member@test.com`＋`0912345678`）實際發送與驗證，上表的 OTP 規則都適用；預設把倒數改成 10 秒方便測重新發送。
- 元件與 hook 在 `src/components/OtpInput/`（`OtpField`、`OtpInput`、`OtpCountdown`、`useOtpSender`、`otpRules`、`getOtpErrorMessage`）。

### 註冊

- 發送 OTP：信箱或手機與現有帳號相同（例如 `member@test.com`、`0912345678`）→ 409 `ALREADY_REGISTERED`。
- 發送 OTP：生日未滿 18 歲且沒填 `guardianName` → 422 `VALIDATION_ERROR`。
- 發送 OTP：信箱／手機格式錯誤（手機需 `09` 開頭共 10 碼）→ 422 `VALIDATION_ERROR`。
- 送出註冊：身分證字號填 `Q123456789`（已存在）→ 409 `ALREADY_REGISTERED`；`registerToken` 錯誤或已用過 → 400 `TOKEN_INVALID`；教會／牧區／小組／EKK 不屬於同一條線 → 422。
- 註冊成功後該帳號為待審核：會出現在 `leader@test.com` 的審核清單，登入回 `ACCOUNT_PENDING`，進度查詢回 `PENDING`。

註冊頁面（`pages/register/`）對應的畫面：

- 跨步驟資料存在 `sessionStorage` 的 `nlc.registerFlow`（`pages/register/registerFlow.ts`）：OTP 驗證步驟寫入 `registerToken`／`birthDate`／`email`／`phone`（／`guardianName`），個資聲明寫入 `agreedToPrivacy`，Line 授權寫入 `lineToken`；送出成功後清除。
- 註冊第一步（`/register`，`Register.tsx`）：填出生／信箱（例如 `new@test.com`）／手機（例如 `0911222333`）按「確認」發送 OTP，上面「OTP」表的驗證碼規則都適用；驗證通過後寫入 `nlc.registerFlow` 並導向個資聲明。出生日期未滿 18 歲會多出「監護人名稱」欄；發送後改了上面任何欄位會回到未發送狀態。
- 會員資料輸入（`/register/profile`）缺 `registerToken`、`agreedToPrivacy`、生日、信箱或手機時導回 `/register`。要跳過前面步驟直接測，可先在 DevTools Console 取得 token 再開頁：

  ```js
  const { registerToken } = await (await fetch('/api/register/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'new@test.com', phone: '0911222333', otp: '1234' }) })).json()
  sessionStorage.setItem('nlc.registerFlow', JSON.stringify({ registerToken, birthDate: '1993-01-01', email: 'new@test.com', phone: '0911222333', agreedToPrivacy: true }))
  history.pushState(null, '', '/register/profile'); dispatchEvent(new PopStateEvent('popstate'))
  ```

  最後一行用站內導覽換頁：mock 的 `registerToken` 存在記憶體，若用 `location.href` 或重新整理，token 會跟著清掉，送出時變成 `TOKEN_INVALID`。要測個資聲明時，把 `agreedToPrivacy: true` 拿掉、網址改 `/register/privacy`。

- 教會／牧區／小組／EKK 選項來自 `db.ts` 的 `ORG_TREE`（例：台北仁愛堂 → 新烏87 → Jessus → Hooo）；選了教會才展開牧區／小組／EKK，改上層會清空下層。
- 身分證字號填 `Q123456789` → 通知彈窗「此身份證字號、電子信箱或手機已註冊」；`registerToken` 失效（例如同一 token 送出第二次）→ 通知彈窗後導回 `/register`。
- 送出成功 → `/register/done`「等待核准中」，「返回」回登入頁。

### 第一次用 SSO 登入填寫會員資料（Logto 模式，#48）

用上方「Logto 模式」的 `?mockLogto=` 切換 SSO 帳號。流程：`/apply`（出生日期＋補填聯絡方式）→ `/apply/privacy`（個資聲明）→ `/apply/profile`（會員資料，不含密碼）→ `/register/done`（等待核准中，「返回」會登出 SSO）。跨步驟資料存在 `sessionStorage` 的 `nlc.applyFlow`。

| 情境 | 結果 |
| --- | --- |
| 補填的 email／手機已被其他帳號使用（例如 `member@test.com`、`0912345678`） | 409 `ALREADY_REGISTERED`，通知彈窗「此電子信箱已被其他帳號使用」 |
| 補填時驗證碼 | 依上方「OTP」規則（`1234` 通過、`0000` 錯誤、`9999` 逾時）；通過後該欄改為唯讀「已驗證」 |
| `nocontact@test.com` 兩欄都空著按「確認」 | 欄位下方「請至少填寫電子信箱或手機」 |
| 身分證字號填 `Q123456789`（已存在） | 409 `ALREADY_REGISTERED`，通知彈窗「此身份證字號已被使用」 |
| 送出成功 | 該帳號變成待審核，出現在 `leader@test.com` 的審核清單（同一個瀏覽器分頁內；重新整理會還原） |

`rejected@test.com` 的申請被退回頁（`/apply/rejected`）顯示退回原因；按「修改資料」從第一步開始，出生日期與會員資料帶入上次填的內容，身分證字號需重新輸入。

### 進度查詢（`/progress`，`POST /register/progress/otp` → `POST /register/progress`）

輸入申請時的信箱**或**手機其中一個，收驗證碼後查看進度（#52）。驗證碼依上方「OTP」規則；查無申請紀錄時發送照樣成功，驗證時一律 400 `OTP_INVALID`（畫面顯示「驗證碼錯誤」，不透露帳號是否存在）。

| 信箱或手機 | 結果頁 |
| --- | --- |
| `pending@test.com` 或 `0945678901` | 等待審核中（附申請日期） |
| `member@test.com` 或 `0912345678` | 已通過審核 |
| `rejected@test.com` 或 `0978901234` | 申請未通過審核（附退回原因） |
| 審核通過／退回後的 `apply1@test.com`（`0956789012`）、`apply2@test.com`（`0967890123`） | 已通過／未通過（同一個瀏覽器分頁內；重新整理會還原） |
| `notfound@test.com` 或 `0900000000` | 發送成功，但驗證時「驗證碼錯誤」 |
| `frequent@test.com` | 429 `TOO_MANY_ATTEMPTS` |

### 忘記密碼

| 輸入 | 結果 |
| --- | --- |
| 未註冊信箱（如 `notfound@test.com`） | 404 `ACCOUNT_NOT_FOUND` |
| `member@test.com` + 不是 `0912345678` 的手機 | 400 `EMAIL_PHONE_MISMATCH` |
| 新密碼不符規則（見下） | 422 `VALIDATION_ERROR` |
| `resetToken` 錯誤或已用過 | 400 `TOKEN_INVALID` |

忘記密碼頁（`/forgot-password`，`pages/forgot-password/ForgotPassword.tsx`；登入頁「忘記密碼？」進入）對應的畫面：

| 情境 | 畫面 |
| --- | --- |
| `member@test.com` + `0912345678` → 確認 | 出現 OTP 列與「有效時間」5 分鐘倒數；OTP 依上方「OTP」規則（`1234` 通過、`0000` 錯誤、`9999` 逾時，錯誤／逾時跳通知彈窗並清空 OTP） |
| `notfound@test.com` | 通知彈窗「查無此帳號」 |
| `member@test.com` + 其他手機（例如 `0999999999`） | 通知彈窗「電子信箱與手機號碼不符」 |
| `frequent@test.com` | 通知彈窗「發送過於頻繁，請稍後再試」 |
| 信箱格式錯誤（`abc`）、手機不是 `09` 開頭 10 碼 | 欄位下方 inline 錯誤，不會呼叫 API |
| 已發送 OTP 後改信箱或手機 | OTP 列消失，回到未發送狀態，按「確認」重新發送 |
| OTP 通過 → 設定新密碼 | 新密碼不符規則、兩次不一致 → inline 錯誤；成功 → `/forgot-password/done`「變更完成！」，「返回」回登入頁，可用新密碼登入（重新整理後還原為 `Member@123`） |

### 修改密碼（`PUT /me/password`）

- 目前密碼錯誤 → 400 `WRONG_CURRENT_PASSWORD`
- 新密碼與目前密碼相同 → 400 `PASSWORD_SAME_AS_OLD`
- 新密碼不符規則 → 422 `VALIDATION_ERROR`

### 個人資訊修改

- 流程：`/profile` 點「編輯資料」→ `/profile/edit` 修改後「確認」（`POST /me/profile-change/otp`）→ 輸入 OTP（上表規則，例如 `1234`）→ 變更完成；回檢視頁、首頁橫幅暱稱會顯示新資料（重新整理後還原）。
- 新信箱／手機已被其他帳號使用（例如改成 `leader@test.com`）→ 409 `ALREADY_REGISTERED`
- 沒先送出修改內容就驗證 OTP → 410 `OTP_EXPIRED`

### 奉獻收據

- 信箱與手機必須等於登入會員自己的資料，否則 400 `EMAIL_PHONE_MISMATCH`（用 `member@test.com` + `0912345678` 測成功）。
- `year` 填 2020 以前（例如 `2019`）→ 404 `NO_RECORDS`；不帶 `year` 視為去年。

奉獻收據頁（`pages/receipt/ReceiptDownload.tsx`，`/receipt`）對應的畫面（頁面目前不帶 `year`）：

| 情境 | 畫面 |
| --- | --- |
| 信箱／手機格式錯誤（例如 `abc`、`0812`） | 欄位下方 inline 錯誤，不會呼叫 API |
| 信箱或手機與登入會員不符 | 通知彈窗「電子信箱或手機與會員資料不符」 |
| 信箱填 `frequent@test.com` | 通知彈窗「發送過於頻繁，請稍後再試」 |
| `member@test.com` + `0912345678` | 出現驗證碼列與「有效時間」倒數；倒數結束可「重新發送」 |
| 驗證碼 `0000`／`9999` | 通知彈窗「驗證碼錯誤，請重新輸入」／「驗證碼已逾時，請重新發送」 |
| 其他 4 碼（例如 `7414`） | 完成頁「奉獻收據已送出，請至信箱查收！」 |
| OTP 發送後修改信箱或手機 | 驗證碼列收起，需重新按「確認」發送 |

### 會員審核

- 一般會員呼叫審核 API → 403 `FORBIDDEN`。
- 退回要帶退回原因（`{ reason }`，#48），沒帶或空白 → 422 `VALIDATION_ERROR`；退回後該申請者的 `GET /me/registration` 會帶回原因。
- 對已通過／已退回的 id 再退回 → 409 `ALREADY_PROCESSED`；不存在的 id → 404 `MEMBER_NOT_FOUND`。
- 批次通過時不存在或已處理的 id 會列在回應的 `failedIds`。
- 清單情境切換：在頁面網址加 `?mockReview=<情境>`（例如 `/member-review?mockReview=empty`），設定存在 `sessionStorage`（`nlc_mms_mock_review`），站內換頁後仍有效，關閉分頁即還原。待審核數量（首頁徽章）也跟著變。

  | 情境 | 結果 |
  | --- | --- |
  | `default`（預設） | 種子資料的 3 位待審核 |
  | `empty` | 清單與數量皆為空（測空狀態）；此時送出審核通過會全部列在 `failedIds` |
  | `many` | 另外加入 12 位待審核（`extra01@test.com`～`extra12@test.com`，密碼 `Extra01@123`…），共 15 位，測長清單與全部選取 |

### 登入失效（401）

沒有 token 或 token 無效時，需登入的 API 回 401 `UNAUTHORIZED`。測試方式：登入後到 DevTools 把 `sessionStorage`（或 `localStorage`）裡 `nlc_mms_auth` 的 `token` 改成任意字串，再操作任一頁面。token 格式為 `mock-token-<使用者 id>`，重新整理頁面不會失效。

### Line 登入（stub）

`GET /auth/line/url` 回傳指向本站 `/auth/line/callback?code=...&state=...` 的網址（不會真的離開網站）。`POST /auth/line/callback` 依 `code`：

| code | 結果 |
| --- | --- |
| `mock-line-code` | 登入 `member@test.com` |
| `mock-line-new` | `REGISTER_REQUIRED`（帶 `lineToken`，接註冊流程） |
| `mock-line-pending` | 403 `ACCOUNT_PENDING` |
| 其他 | 400 `TOKEN_INVALID` |

登入頁按「使用Line快速登入」會導到 `/auth/line/callback?code=mock-line-code&state=mock-state`（`pages/login/LineCallback.tsx`），直接登入 `member@test.com`。其他情境可直接開網址並改 `code`：`mock-line-new` → 「Line創建成功」頁（`/register/line`，`lineToken` 存進 `nlc.registerFlow`），2 秒後自動跳到註冊第一步 `/register`、`mock-line-pending` → 等待審核頁、任意其他值 → 回登入頁並跳通知彈窗。

## 暫定的密碼規則

設計未定義，mock 暫定：至少 8 碼，且同時包含英文與數字（註冊、重設、修改密碼共用）。規則集中在 `src/constants/password.ts`（前端表單驗證與 mock 的 `assertPassword` 共用），後端定案後只改那個檔案。

## 檔案結構

```
src/mocks/
  browser.ts          setupWorker
  db.ts               假資料與記憶體資料庫（教會組織、使用者）
  utils.ts            延遲、錯誤回應、token／OTP／欄位驗證
  DevRoleSwitcher.tsx 開發用切換登入身分
  OtpDemo.tsx         開發用 OTP 元件示範（/dev/otp）
  handlers/
    index.ts          彙整所有 handler
    auth.ts           登入、登出、Line（登入成功回 { token, role, status: 'ACTIVE' }）
    register.ts       註冊、個資聲明、進度查詢
    registration.ts   Logto 模式第一次登入填寫會員資料（#48）
    password.ts       忘記密碼、修改密碼
    member.ts         /me、個人資訊修改
    options.ts        教會／牧區／小組／EKK／靈程
    receipt.ts        奉獻收據
    review.ts         會員審核
```

新增 API 時：在 `src/api/types.ts` 加型別、`src/api/*.ts` 加函式、`handlers/*.ts` 加對應 handler，並更新 `backend/README.md` 與本檔。
