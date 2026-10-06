# Backend

後端程式待匯入，目前只保留資料夾。本文件是給後端團隊的 **API 契約**（前端已依此實作並以 MSW 假資料開發）。

- 型別定義：[`frontend/src/api/types.ts`](../frontend/src/api/types.ts)
- 前端呼叫函式：`frontend/src/api/*.ts`
- 假資料與各情境觸發方式：[`frontend/src/mocks/README.md`](../frontend/src/mocks/README.md)
- 設計來源與待確認事項：`docs/design/*/README.md`

> 契約依設計稿「推測」整理，標示「暫定」的地方後端可提出調整；調整後請同步修改 `types.ts`、`src/api/*.ts`、`src/mocks/` 與本文件。

## 與前端的串接約定

- 前端開發伺服器會把 `/api/*` 代理到 `VITE_API_PROXY_TARGET`（預設 `http://localhost:3000`），可在 `frontend/.env.local` 修改。
- 前端統一透過 `frontend/src/api/client.ts` 呼叫 API。
- 開發模式預設使用 MSW 假資料；後端可用後在 `frontend/.env.local` 設定 `VITE_USE_MOCK=false` 即可改打真實後端。

## 通用規則

- Base path：`/api`。Request／Response 一律 JSON（`Content-Type: application/json`），欄位使用 camelCase；時間為 ISO 8601 字串，生日為 `YYYY-MM-DD`。
- 認證：登入後帶 `Authorization: Bearer <token>`。標示「需登入」的 API 缺少或帶無效 token 時回 `401 UNAUTHORIZED`。
- **401 只保留給 token 缺少／過期／無效。** 前端遇到任何 401 都會清掉 token 並導回登入頁，所以登入帳密錯誤、目前密碼錯誤等請用下方對應的 4xx，不要回 401。
- 閒置 7 分鐘自動登出（前端計時）：後端 token／session 逾時時間需與此一致（待確認）。
- 成功：有內容回 `200`（註冊回 `201`），無內容回 `204`（Response 欄位標「無」）。
- 失敗：非 2xx，body 固定為：

  ```json
  { "code": "WRONG_PASSWORD", "message": "密碼輸入錯誤", "fields": { "password": "..." } }
  ```

  `code` 為下表字串（前端依 `code` 決定顯示哪個 popup）；`message` 為可直接顯示的繁體中文；`fields` 只在 `VALIDATION_ERROR` 時帶，為「欄位名稱 → 錯誤訊息」。
- 角色：`member`（一般會員）、`leader`（區長以上）。前端路由與選單依角色顯示（`frontend/src/auth/`），但權限仍須由後端驗證。

### 錯誤碼

| code | HTTP | 說明 |
| --- | --- | --- |
| `ACCOUNT_NOT_FOUND` | 404 | 查無此帳號 |
| `WRONG_PASSWORD` | 400 | 登入密碼輸入錯誤 |
| `TOO_MANY_ATTEMPTS` | 429 | 登入或發送 OTP 過度頻繁，請稍後再試（門檻待確認） |
| `ACCOUNT_LOCKED` | 423 | 帳號已鎖定，需聯繫教會（教會確認後解鎖並寄信通知） |
| `ACCOUNT_PENDING` | 403 | 帳號尚未核准（前端顯示等待審核頁） |
| `ACCOUNT_REJECTED` | 403 | 申請被退回（設計未畫，推測） |
| `OTP_INVALID` | 400 | 驗證碼錯誤 |
| `OTP_EXPIRED` | 410 | 驗證碼逾時 |
| `TOKEN_INVALID` | 400 | `registerToken`／`resetToken` 無效、過期或已使用 |
| `EMAIL_PHONE_MISMATCH` | 400 | 信箱與手機不屬於同一帳號，或與登入會員資料不符 |
| `ALREADY_REGISTERED` | 409 | 信箱、手機或身分證字號已被使用 |
| `WRONG_CURRENT_PASSWORD` | 400 | 修改密碼時目前密碼錯誤 |
| `PASSWORD_SAME_AS_OLD` | 400 | 新密碼與舊密碼相同 |
| `NO_RECORDS` | 404 | 該年度無奉獻紀錄 |
| `MEMBER_NOT_FOUND` | 404 | 審核對象不存在 |
| `ALREADY_PROCESSED` | 409 | 申請已被審核或退回 |
| `VALIDATION_ERROR` | 422 | 欄位缺漏或格式錯誤，帶 `fields` |
| `FORBIDDEN` | 403 | 已登入但沒有權限（例如一般會員呼叫會員審核） |
| `UNAUTHORIZED` | 401 | 未登入或 token 無效／過期 |

`NETWORK_ERROR`（連不到後端）與 `UNKNOWN` 由前端產生，後端不需回傳。

### OTP 通用規則

所有「發送 OTP」API 成功都回：

```json
{ "expiresIn": 300, "length": 4 }
```

`expiresIn` 為有效秒數（前端倒數用，暫定 5 分鐘）、`length` 為驗證碼位數（暫定 4）。**重新發送 = 再呼叫一次同一支發送 API**，沒有另外的 resend 端點。OTP 送達方式（簡訊／信箱）與修改信箱時寄到舊或新位置，設計待確認。

### 密碼規則（暫定）

設計未定義。前端 mock 暫定「至少 8 碼，且同時包含英文與數字」，不符回 `422 VALIDATION_ERROR`（`fields` 指到欄位）。

---

## 登入與帳號

### POST /auth/login

登入。

- Request：`{ "email": string, "password": string }`
- Response 200：`{ "token": string, "role": "member" | "leader", "status": "ACTIVE" | "PENDING" }`
  - `status` 為帳號狀態。目前待審核帳號登入直接回 `ACCOUNT_PENDING`，所以成功時一律 `ACTIVE`；若後端改成允許待審核帳號登入，回 `PENDING` 時前端會擋在等待審核頁、不進會員中心。
- 錯誤：`ACCOUNT_NOT_FOUND`、`WRONG_PASSWORD`、`TOO_MANY_ATTEMPTS`、`ACCOUNT_LOCKED`、`ACCOUNT_PENDING`、`ACCOUNT_REJECTED`、`VALIDATION_ERROR`

「記住帳號」只影響前端把 token 存 localStorage 或 sessionStorage，不影響這支 API。

### POST /auth/logout

需登入（token 已失效也請回 204，前端一律清掉本機 token）。Request 無；Response 204。

### GET /auth/line/url?purpose=login|register

取得 Line OAuth 授權網址（目前為 stub）。

- Response 200：`{ "url": string }`，前端直接導向該網址。

### POST /auth/line/callback

Line 授權完成後，前端以 `code` 換登入結果（目前為 stub）。

- Request：`{ "code": string, "state": string }`
- Response 200（二擇一）：
  - `{ "status": "LOGGED_IN", "token": string, "role": Role, "accountStatus": "ACTIVE" | "PENDING" }`（`accountStatus` 同登入的 `status`）
  - `{ "status": "REGISTER_REQUIRED", "lineToken": string }`：Line 帳號尚未建立，接回一般創建流程（接回哪一步設計待確認）
- 錯誤：`ACCOUNT_PENDING`、`TOKEN_INVALID`

### POST /register/progress

審核進度查詢。查詢條件設計未畫，暫定信箱＋手機（用 POST 避免個資出現在網址）。信箱與手機任一不符都回 `ACCOUNT_NOT_FOUND`，避免被拿來探測帳號。

- Request：`{ "email": string, "phone": string }`
- Response 200：`{ "status": "PENDING" | "APPROVED" | "REJECTED", "submittedAt": string, "reviewedAt"?: string }`
- 錯誤：`ACCOUNT_NOT_FOUND`、`TOO_MANY_ATTEMPTS`

## 註冊

流程：發送 OTP → 驗證 OTP（取得 `registerToken`）→ 個資聲明 → 會員資料送出。

### POST /register/otp

發送註冊用 OTP，同時檢查信箱／手機是否已被註冊。

- Request：`{ "birthDate": "YYYY-MM-DD", "email": string, "phone": string, "guardianName"?: string }`
  - 未滿 18 歲時 `guardianName` 必填（設計目前只有「監護人名稱」一欄）。
  - 手機為台灣手機：`09` 開頭共 10 碼。
- Response 200：`{ "expiresIn": 300, "length": 4 }`
- 錯誤：`ALREADY_REGISTERED`、`TOO_MANY_ATTEMPTS`、`VALIDATION_ERROR`

### POST /register/otp/verify

- Request：`{ "email": string, "phone": string, "otp": string }`
- Response 200：`{ "registerToken": string }`（OTP 驗證通過的憑證，送出註冊時帶回）
- 錯誤：`OTP_INVALID`、`OTP_EXPIRED`

### GET /register/privacy-statement

個資保護聲明內容（若改寫死在前端可移除此 API）。

- Response 200：`{ "title": string, "content": string, "version": string }`（`content` 為純文字，段落以空行分隔）

### POST /register

送出註冊，成功後帳號為待審核。

- Request：

  ```json
  {
    "registerToken": "string",
    "lineToken": "string (Line 創建流程，暫定)",
    "birthDate": "YYYY-MM-DD",
    "email": "string",
    "phone": "string",
    "guardianName": "string (未滿 18 歲)",
    "name": "string",
    "nickname": "string (選填)",
    "gender": "male | female",
    "idNumber": "string (明碼)",
    "password": "string",
    "churchId": "string",
    "districtId": "string",
    "groupId": "string",
    "ekkId": "string",
    "journey": "NF | VIP | XN",
    "agreedToPrivacy": true
  }
  ```

- Response 201：`{ "id": string, "status": "PENDING" }`
- 錯誤：`TOKEN_INVALID`、`ALREADY_REGISTERED`、`VALIDATION_ERROR`（含教會／牧區／小組／EKK 不屬於同一條線、`agreedToPrivacy` 不是 true）
- 審核結果（通過／退回）由後端用 Email 或簡訊通知申請者，不經此 API。

## 下拉選項（註冊用，不需登入）

教會 → 牧區 → 小組 → EKK 為連動選項，每個層級只回直屬子項。選項為 `{ "id": string, "name": string }`。

| API | Response 200 |
| --- | --- |
| `GET /options/churches` | 教會列表 |
| `GET /options/districts?churchId=` | 該教會的牧區 |
| `GET /options/groups?districtId=` | 該牧區的小組 |
| `GET /options/ekk?groupId=` | 該小組的 EKK（設計未說明 EKK 依誰連動，暫定依小組） |
| `GET /options/journeys` | 靈程：`[{ "id": "NF" \| "VIP" \| "XN", "name": string }]` |

缺少必要 query 參數回 `VALIDATION_ERROR`；父層沒有子項回 `[]`。

## 密碼

### POST /password/forgot/otp

忘記密碼：檢查信箱與手機屬於同一帳號並發送 OTP。

- Request：`{ "email": string, "phone": string }`
- Response 200：`{ "expiresIn": 300, "length": 4 }`
- 錯誤：`ACCOUNT_NOT_FOUND`、`EMAIL_PHONE_MISMATCH`、`TOO_MANY_ATTEMPTS`、`VALIDATION_ERROR`

### POST /password/forgot/verify

- Request：`{ "email": string, "phone": string, "otp": string }`
- Response 200：`{ "resetToken": string }`（一次性重設憑證）
- 錯誤：`OTP_INVALID`、`OTP_EXPIRED`、`EMAIL_PHONE_MISMATCH`

### POST /password/forgot/reset

- Request：`{ "resetToken": string, "newPassword": string }`
- Response 204
- 錯誤：`TOKEN_INVALID`、`VALIDATION_ERROR`

### PUT /me/password

已登入會員修改密碼（不需 OTP）。需登入。

- Request：`{ "currentPassword": string, "newPassword": string }`
- Response 204
- 錯誤：`WRONG_CURRENT_PASSWORD`、`PASSWORD_SAME_AS_OLD`、`VALIDATION_ERROR`、`UNAUTHORIZED`
- 修改後是否作廢其他裝置 session、是否強制重新登入：待確認。

## 會員資料

### GET /me

需登入。

- Response 200：

  ```json
  {
    "id": "string",
    "name": "林大頭",
    "nickname": "彼得的魚",
    "gender": "male | female",
    "idNumber": "Q12*****89",
    "email": "string",
    "phone": "string",
    "church": "台北仁愛堂",
    "district": "新烏87",
    "group": "Jessus",
    "ekk": "Hooo",
    "journey": "NF | VIP | XN",
    "role": "member | leader"
  }
  ```

  `idNumber` 由後端遮罩（前 3 碼＋`*****`＋後 2 碼）；`church`／`district`／`group`／`ekk` 為顯示名稱。手機目前回完整號碼（編輯頁需要帶入），是否遮罩待確認。前端用 `role` 決定是否顯示「會員審核」。

### POST /me/profile-change/otp

個人資訊修改：送出要修改的內容並發送 OTP。後端先暫存修改內容，OTP 驗證通過才正式寫入。只有姓名、暱稱、信箱、手機可修改。需登入。

- Request：`{ "name": string, "nickname": string, "email": string, "phone": string }`
- Response 200：`{ "expiresIn": 300, "length": 4 }`
- 錯誤：`ALREADY_REGISTERED`（新信箱／手機已被其他帳號使用）、`TOO_MANY_ATTEMPTS`、`VALIDATION_ERROR`

### POST /me/profile-change/verify

需登入。

- Request：`{ "otp": string }`
- Response 200：更新後的 `Me`（格式同 `GET /me`）
- 錯誤：`OTP_INVALID`、`OTP_EXPIRED`（含沒有待驗證的修改）

## 奉獻收據

收據不在網頁直接下載，而是驗證後寄到信箱（附件以身分證字號為密碼，設計推測）。需登入。

### POST /receipts/otp

- Request：`{ "email": string, "phone": string, "year"?: number }`
  - 信箱、手機需與登入會員資料一致（設計待確認：是否可寄到任意信箱）。
  - `year` 設計未決定（文案寫「該年度」但沒有選擇），不帶由後端決定。
- Response 200：`{ "expiresIn": 300, "length": 4 }`
- 錯誤：`EMAIL_PHONE_MISMATCH`、`TOO_MANY_ATTEMPTS`、`VALIDATION_ERROR`

### POST /receipts/send

驗證 OTP 並寄出收據。

- Request：`{ "email": string, "phone": string, "otp": string, "year"?: number }`
- Response 204
- 錯誤：`OTP_INVALID`、`OTP_EXPIRED`、`EMAIL_PHONE_MISMATCH`、`NO_RECORDS`

## 會員審核（區長以上）

以下 API 都需登入且 `role = leader`，否則 `403 FORBIDDEN`。區長是否只能看到自己牧區／小組的申請，由後端過濾（待確認）。

### GET /members/pending/count

首頁「會員審核」卡片的紅色徽章數字。

- Response 200：`{ "count": number }`

### GET /members/pending

待審核清單（目前沒有分頁、搜尋、篩選；依送出時間由舊到新）。

- Response 200：

  ```json
  [
    {
      "id": "string",
      "name": "string",
      "nickname": "string",
      "gender": "male | female",
      "email": "string",
      "phone": "string",
      "church": "string",
      "district": "string",
      "group": "string",
      "ekk": "string",
      "journey": "NF | VIP | XN",
      "submittedAt": "ISO 8601"
    }
  ]
  ```

### POST /members/approve

批次審核通過，只送勾選的 id。

- Request：`{ "ids": string[] }`（至少一筆，否則 `VALIDATION_ERROR`）
- Response 200：`{ "approved": number, "failedIds": string[] }`；不存在或已處理的 id 列在 `failedIds`，其餘照常通過（部分失敗的回報方式待確認）。

### POST /members/{id}/reject

單筆退回（目前沒有退回原因欄位；若加則 request 帶 `{ "reason": string }`）。

- Request：無
- Response 204
- 錯誤：`MEMBER_NOT_FOUND`、`ALREADY_PROCESSED`
- 是否通知申請者、退回後可否重新申請：待確認。

---

## 設計尚未決定、後端需要一起確認的事項

- 登入過度頻繁／帳號鎖定的門檻與時間；鎖定後教會解鎖並寄信的後台流程。
- OTP 送達方式、長度、有效時間，以及修改信箱／手機時寄到舊或新位置。
- 密碼規則；Line 建立的帳號沒有密碼時能否走忘記密碼流程。
- 進度查詢的查詢條件。
- Line OAuth 的 callback 處理與「接回一般創建流程」的步驟。
- 奉獻收據的年度、是否必須與會員資料一致、附件格式與無身分證字號會員的處理。
- 會員審核的資料範圍（區長只看自己牧區？「區長以上」的角色清單）與退回是否通知申請者。
- 閒置自動登出（7 分鐘）與 token 逾時時間的對應。
