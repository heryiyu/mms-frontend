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
- 認證：登入後帶 `Authorization: Bearer <token>`。標示「需登入」的 API 缺少或帶無效 token 時回 `401 UNAUTHORIZED`。token 來源分兩種模式，見下方「認證模式」。
- **401 只保留給 token 缺少／過期／無效。** 前端遇到任何 401 都會清掉 token 並導回登入頁，所以登入帳密錯誤、目前密碼錯誤等請用下方對應的 4xx，不要回 401。
- 閒置 7 分鐘自動登出由前端計時，**後端不需要自己的閒置逾時**（2026-10-15 確認）：Logto 模式下後端不發 token、不保存 session，只驗證 Logto access token 的 `exp`；token 由前端 SDK 在到期前自動換新，不會在 7 分鐘內因過期回 401（否則使用者會被直接導回登入頁、看不到「已自動登出」彈窗）。逾時時前端會結束 Logto session。本機模式（開發用）的 `/auth/login` token 有效期請不要短於 7 分鐘。
- 成功：有內容回 `200`（註冊回 `201`），無內容回 `204`（Response 欄位標「無」）。
- 失敗：非 2xx，body 固定為：

  ```json
  { "code": "WRONG_PASSWORD", "message": "密碼輸入錯誤", "fields": { "password": "..." } }
  ```

  `code` 為下表字串（前端依 `code` 決定顯示哪個 popup）；`message` 為可直接顯示的繁體中文；`fields` 只在 `VALIDATION_ERROR`、`CONTACT_IN_USE` 時帶，為「欄位名稱 → 錯誤訊息」。
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
| `EMAIL_PHONE_MISMATCH` | 400 | 信箱與手機不屬於同一帳號（忘記密碼）。奉獻收據 #50 起不再使用 |
| `ALREADY_REGISTERED` | 409 | 信箱、手機或身分證字號已被使用 |
| `CONTACT_IN_USE` | 409 | 個人資訊修改：新的 email／手機已被**其他 SSO 帳號**使用（#49），帶 `fields` 指出哪一欄 |
| `WRONG_CURRENT_PASSWORD` | 400 | 修改密碼時目前密碼錯誤 |
| `PASSWORD_SAME_AS_OLD` | 400 | 新密碼與舊密碼相同 |
| `PASSWORD_NOT_SET` | 400 | 帳號沒有密碼（只用 Line／Google 登入），不能修改密碼（#49） |
| `NO_RECORDS` | 404 | 該年度無奉獻紀錄 |
| `LINK_EXPIRED` | 410 | 奉獻收據簡訊下載連結已過期（寄出後 1 小時，#50） |
| `RECEIPT_NOT_FOUND` | 404 | 查無此奉獻收據下載連結（#50） |
| `MEMBER_NOT_FOUND` | 404 | 審核對象不存在 |
| `ALREADY_PROCESSED` | 409 | 申請已被審核或退回；會員資料申請已送出過（`POST /me/registration`） |
| `VALIDATION_ERROR` | 422 | 欄位缺漏或格式錯誤，帶 `fields` |
| `FORBIDDEN` | 403 | 已登入但沒有權限（例如一般會員呼叫會員審核、開別人的奉獻收據下載連結） |
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

### 認證模式（#44）

前端依 `frontend/.env.local` 是否設定 `VITE_LOGTO_ENDPOINT`、`VITE_LOGTO_APP_ID` 切換：

| | Logto 模式（正式） | 本機模式（開發用） |
| --- | --- | --- |
| 登入、註冊、忘記密碼 | 轉址到 Logto 登入頁（`sso.newlife.org.tw`），不經過本後端 | 前端頁面呼叫本後端 `/auth/login`、`/register/*`、`/password/forgot/*` |
| Bearer token | Logto 發的 access token（JWT），audience 為 `VITE_LOGTO_RESOURCE` | `/auth/login` 回傳的 token |
| 取得角色與帳號狀態 | 登入完成後呼叫 `GET /auth/session` | `/auth/login` 的回應 |
| 會員資料（新會員） | 第一次登入後在會員中心填寫：`/me/registration*`（#48） | 註冊流程一併填寫：`/register*` |

Logto 模式下後端要：

- 驗證 JWT：簽章用 `https://sso.newlife.org.tw/oidc/jwks`，`iss` 為 `https://sso.newlife.org.tw/oidc`，`aud` 為前端設定的 API resource，並檢查 `exp`。
- 以 `sub`（Logto 使用者 ID）對應會員資料。會員資料、審核狀態、角色由本後端管理，Logto 只負責身分驗證。
- refresh token 由前端 SDK 處理，後端不需要也不會收到。`POST /auth/logout` 在 Logto 模式不會被呼叫（前端直接結束 Logto session）。

---

## 登入與帳號

### GET /auth/session

Logto 模式：登入完成後，以 Logto access token 取得會員中心的角色與帳號狀態（暫定）。需登入。

- Response 200：`{ "role": "member" | "leader", "status": "ACTIVE" | "PENDING" | "UNREGISTERED" | "REJECTED" }`
  - 已通過 SSO 驗證的人一律回 200（#48），前端依 `status` 導頁：
    - `ACTIVE`：進入會員中心
    - `PENDING`：等待審核頁
    - `UNREGISTERED`：這個 SSO 帳號還沒有會員資料 → 會員資料填寫流程（見下方「會員資料申請」）；`role` 回 `member`
    - `REJECTED`：申請被退回 → 顯示退回原因，可修改後重新送出
- 錯誤：`ACCOUNT_LOCKED`、`UNAUTHORIZED`

> 以下 `/auth/login`、`/auth/logout`、`/auth/line/*` 為本機模式使用。Logto 上線後，登入與 Line 登入改由 Logto 處理，這幾支可以不實作。

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

### 審核進度查詢（#52，架構整理 D8）

不需登入。輸入申請時的 email **或**手機其中一個，收驗證碼後查看進度（會員可能只有其中一個）。用 POST 避免個資出現在網址。

**不透露帳號是否存在**：加驗證碼是為了避免別人輸入任意號碼探查誰申請過，所以查無申請紀錄時：

- 發送驗證碼照樣回 200（實際上不寄出）
- 驗證時一律回 `OTP_INVALID`（和驗證碼打錯一樣）

#### POST /register/progress/otp

發送驗證碼（email 寄信、手機發簡訊）。重新發送也是呼叫這支。

- Request：`{ "email": string }` 或 `{ "phone": string }`（擇一）
- Response 200：`{ "expiresIn": 300, "length": 4 }`
- 錯誤：`VALIDATION_ERROR`（格式錯誤、兩個都帶或都沒帶）、`TOO_MANY_ATTEMPTS`

#### POST /register/progress

驗證通過後回傳進度。

- Request：`{ "email": string, "otp": string }` 或 `{ "phone": string, "otp": string }`（與發送時相同）
- Response 200：`{ "status": "PENDING" | "APPROVED" | "REJECTED", "submittedAt": string, "reviewedAt"?: string, "rejectReason"?: string }`
  - `APPROVED` 含已通過後被鎖定的帳號；`rejectReason` 只在 `REJECTED` 時帶（#48 退回時填的原因）
  - 已登入 SSO、但還沒送出會員資料的人（`UNREGISTERED`）視為查無申請紀錄
- 錯誤：`OTP_INVALID`（含查無申請紀錄）、`OTP_EXPIRED`（含沒有對應的發送紀錄）、`VALIDATION_ERROR`、`TOO_MANY_ATTEMPTS`

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

## 會員資料申請（Logto 模式，#48）

帳號、密碼在 SSO 註冊（只有名字、email 或手機擇一、密碼）；第一次登入會員中心時再填會員資料，送出後為待審核。
被退回的人用同一組 API 修改後重新送出。以下都需登入（Logto access token），但**不需要已有會員資料**。

前端流程：出生日期＋補填聯絡方式（選填，填了要驗證）→ 個資保護聲明（`GET /register/privacy-statement`）→ 會員資料 → 送出。

- 以 SSO 使用者 ID（JWT 的 `sub`）對應會員資料。
- **email、手機以 SSO 為準**。會員中心可補填另一個，驗證通過後由後端用 Logto Management API 寫回 SSO，之後兩個都能登入。需要 IT 在 SSO 後台建一個給後端用的機器對機器（M2M）應用程式並開 Management API 權限。
- **姓名以會員中心為準**：送出時同步寫回 SSO 的名字。
- email、手機至少要有一個（用 Line、Google 註冊的人可能兩個都沒有，填寫時至少要補一個）；只有其中一個是允許的。

### GET /me/registration

- Response 200：

  ```json
  {
    "status": "UNREGISTERED | REJECTED | PENDING | ACTIVE",
    "account": { "name": "string | null", "email": "string | null", "phone": "string | null" },
    "rejectReason": "string（REJECTED 才有）",
    "previous": {
      "birthDate": "YYYY-MM-DD",
      "guardianName": "string",
      "name": "string",
      "nickname": "string",
      "gender": "male | female",
      "churchId": "string",
      "districtId": "string",
      "groupId": "string",
      "ekkId": "string",
      "journey": "NF | VIP | XN"
    }
  }
  ```

  - `account`：SSO 帳號的名字與**已驗證**的 email／手機，沒有的欄位為 `null`。前端用來帶入姓名、顯示已驗證的聯絡方式。
  - `previous`：`REJECTED` 時帶回上次送出的內容（欄位都可省略），**不含身分證字號**（前端要求重新輸入）。
  - `PENDING`／`ACTIVE` 時前端會改導到等待審核頁／首頁。
- 錯誤：`ACCOUNT_LOCKED`、`UNAUTHORIZED`

### POST /me/registration/contact/otp

補填 SSO 帳號沒有的聯絡方式：發送驗證碼（簡訊或 email）。重新發送也是呼叫這支。

- Request：`{ "email": string }` 或 `{ "phone": string }`（擇一）
- Response 200：`{ "expiresIn": 300, "length": 4 }`
- 錯誤：
  - `ALREADY_REGISTERED`：已被**其他 SSO 帳號**使用（要在發驗證碼前擋下，否則寫回 SSO 會失敗）
  - `VALIDATION_ERROR`：格式錯誤、兩個都帶或都沒帶、帳號已經有這個聯絡方式
  - `TOO_MANY_ATTEMPTS`

### POST /me/registration/contact/verify

- Request：`{ "email": string, "otp": string }` 或 `{ "phone": string, "otp": string }`（與發送時相同）
- 驗證通過後**立即寫回 SSO**，回傳更新後的帳號資料。
- Response 200：`{ "name": string | null, "email": string | null, "phone": string | null }`（同 `GET /me/registration` 的 `account`）
- 錯誤：`OTP_INVALID`、`OTP_EXPIRED`（含沒有對應的發送紀錄）、`ALREADY_REGISTERED`

### POST /me/registration

送出會員資料，成功後帳號為待審核；`REJECTED` 的人重新送出也是這支（改回待審核、清掉退回原因）。

- Request：

  ```json
  {
    "birthDate": "YYYY-MM-DD",
    "guardianName": "string (未滿 18 歲)",
    "name": "string",
    "nickname": "string (選填)",
    "gender": "male | female",
    "idNumber": "string (明碼)",
    "churchId": "string",
    "districtId": "string",
    "groupId": "string",
    "ekkId": "string",
    "journey": "NF | VIP | XN",
    "agreedToPrivacy": true,
    "privacyVersion": "string（同意的個資聲明版本）"
  }
  ```

  email、手機不在 request 裡，以 SSO 帳號上已驗證的為準。

- Response 201：`{ "status": "PENDING" }`
- 錯誤：
  - `ALREADY_REGISTERED`：身分證字號已被使用
  - `ALREADY_PROCESSED`：已送出過（`PENDING`／`ACTIVE`）
  - `VALIDATION_ERROR`：欄位缺漏、教會／牧區／小組／EKK 不屬於同一條線、未滿 18 歲沒填監護人、`agreedToPrivacy` 不是 true、SSO 帳號 email 和手機都沒有（`fields.contact`）
  - `ACCOUNT_LOCKED`
- 審核結果（通過／退回，退回附原因）由後端用 Email 或簡訊通知申請者：有 email 寄 email，只有手機發簡訊。

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
- 錯誤：`WRONG_CURRENT_PASSWORD`、`PASSWORD_SAME_AS_OLD`、`PASSWORD_NOT_SET`、`VALIDATION_ERROR`、`UNAUTHORIZED`
- 修改後是否作廢其他裝置 session、是否強制重新登入：待確認（前端目前修改成功後一律登出、請使用者重新登入）。
- **Logto 模式（#49，架構整理 D4）**：密碼存在 SSO，後端改用 Logto Management API（見下方「寫回 SSO」）：
  1. 沒有密碼（只用 Line／Google 登入）→ `PASSWORD_NOT_SET`。前端依 `GET /me` 的 `hasPassword` 隱藏入口，這裡是直接打 API 時的防線
  2. 到 SSO 檢查目前密碼，錯了回 `WRONG_CURRENT_PASSWORD`（不要回 401）
  3. 新密碼與目前密碼相同 → `PASSWORD_SAME_AS_OLD`；不符 SSO 的密碼規則 → `VALIDATION_ERROR`（`fields.newPassword`）
  4. 到 SSO 設定新密碼
- 沒有密碼的人想設定密碼：到 SSO 登入頁用「忘記密碼」設定（不經會員中心）。

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
    "role": "member | leader",
    "hasPassword": true
  }
  ```

  `idNumber` 由後端遮罩（前 3 碼＋`*****`＋後 2 碼），沒有身分證字號（外籍）的會員回空字串（#50）；`church`／`district`／`group`／`ekk` 為顯示名稱。手機目前回完整號碼（編輯頁需要帶入），是否遮罩待確認。前端用 `role` 決定是否顯示「會員審核」。

  #49（Logto 模式）：

  - `email`、`phone` 以 SSO 帳號為準，**可能只有其中一個，沒有的回 `null`**（至少會有一個，D5）。
  - `hasPassword`：SSO 帳號有沒有密碼。只用 Line／Google 登入的人為 `false`，前端不顯示「修改密碼」選單，直接開 `/change-password` 時顯示「沒有設定密碼，可到 SSO 登入頁用『忘記密碼』設定」。本機模式依會員中心有沒有存密碼。

### POST /me/profile-change/otp

個人資訊修改：送出要修改的內容並發送 OTP。後端先暫存修改內容，OTP 驗證通過才正式寫入。只有姓名、暱稱、信箱、手機可修改。需登入。

- Request：`{ "name": string, "nickname": string, "email": string, "phone": string }`
  - `email`、`phone` 送**空字串 = 沒有**：原本沒有就維持沒有；原本有就是刪除（#49）。
  - 原本沒有的那個（例如只有 email 的人填了手機）= **新增**，同樣走這個「發送 OTP → 驗證」流程。
- Response 200：`{ "expiresIn": 300, "length": 4 }`
- 錯誤：
  - `VALIDATION_ERROR`：格式錯誤；`email`、`phone` 都是空字串（至少要留一個，D5），`fields` 兩欄都帶，例：`{ "email": "信箱和手機至少要留一個", "phone": "信箱和手機至少要留一個" }`
  - `CONTACT_IN_USE`：新的 email／手機已被**其他 SSO 帳號**使用（#49）。**要在發驗證碼前擋下**，否則驗證通過後寫回 SSO 會失敗。要查的是 SSO 的所有使用者（含還沒填會員資料的 SSO 帳號），不只會員中心的會員。`fields` 指出哪一欄，例：`{ "phone": "此手機已被其他帳號使用" }`（前端顯示在該欄位下方）。和自己目前的值相同不算。
  - `TOO_MANY_ATTEMPTS`
  - 舊版的 `ALREADY_REGISTERED` 前端仍會顯示通用提示，但請改回 `CONTACT_IN_USE`。

### POST /me/profile-change/verify

需登入。

- Request：`{ "otp": string }`
- Response 200：更新後的 `Me`（格式同 `GET /me`）
- 錯誤：`OTP_INVALID`、`OTP_EXPIRED`（含沒有待驗證的修改）、`CONTACT_IN_USE`（發送後到驗證前被別人搶先用掉，前端顯示後端的 `message`）
- **Logto 模式（#49，架構整理 D2、D3）**：驗證通過後由後端寫回 SSO（見下方「寫回 SSO」），之後新的 email／手機可以用來登入：
  - 姓名以會員中心為準：改了姓名就同步寫回 SSO 的名字
  - email、手機有變（新增、修改、刪除）就寫回 SSO 的主要 email／手機
  - 寫回 SSO 失敗時，會員中心的資料也不要改（避免兩邊不一致），回 5xx 或對應錯誤碼讓使用者重試

### 寫回 SSO（Logto Management API，#48、#49 共用）

email、手機、密碼存在 SSO（架構整理 D2～D4），會員中心改這些資料時由後端呼叫 Logto Management API：

- **IT 要在 SSO 後台建一個給後端用的機器對機器（M2M）應用程式**，指派 Management API 權限（`all`），把 App ID／Secret 給後端。#48 補填聯絡方式也用同一個。
- 以 JWT 的 `sub` 當 Logto 使用者 ID。以下端點名稱供參考，請以 Logto 官方文件與自架版版本為準：

  | 用途 | Logto Management API |
  | --- | --- |
  | `GET /me` 的 `hasPassword` | `GET /api/users/{userId}/has-password` |
  | 檢查 email／手機是否已被其他帳號使用 | `GET /api/users?search=...`（或寫入時的 422 錯誤，但要在發驗證碼前先查） |
  | 寫回姓名、email、手機 | `PATCH /api/users/{userId}`（`name`、`primaryEmail`、`primaryPhone`；刪除送 `null`） |
  | 修改密碼：檢查目前密碼 | `POST /api/users/{userId}/password/verify` |
  | 修改密碼：設定新密碼 | `PATCH /api/users/{userId}/password` |

- 手機格式：會員中心用台灣手機 `09xxxxxxxx`，Logto 存的是國碼格式（例如 `886912345678`），寫入與查詢時要轉換。
- `POST /me/registration/contact/*`（#48）、`POST /me/profile-change/*`、`PUT /me/password` 都經過這裡。

## 奉獻收據

收據不在網頁直接下載，而是用會員**已有的** email 或手機做二次驗證後寄出。需登入。

#50（2026-10-15 決定，依業界常見做法）：

- **不再輸入 email、手機**：前端直接顯示會員已有的聯絡方式（`GET /me`，以 SSO 為準，可能只有其中一個）。兩個都有 → 會員選寄到哪一個（預設 email）；只有一個 → 直接用那一個。驗證碼寄到選定的那一個。
- **寄送方式**：
  - `email`：照舊，寄加密 PDF 附件。
  - `phone`：簡訊**不放檔案連結**，只放會員中心下載頁網址 `https://<會員中心>/receipt/download/{id}`。下載頁要登入、只有收據本人能下載；**寄出後 1 小時內有效**，期間可重複開啟；過期要重新申請。登入後按「下載」時，前端再向後端要一個即時產生、**5 分鐘內有效**的檔案網址（見下方「下載頁」）。簡訊被別人看到也拿不到收據。
- **PDF 密碼**：身分證字號；沒有身分證字號的會員改用出生年月日 8 碼（`YYYYMMDD`）。寄送時（信件內文、簡訊、下載頁）告知密碼規則，**不寫出密碼本身**。前端依回應的 `passwordRule` 顯示說明。
- **簡訊由後端直接呼叫簡訊商 API**（可以跟 SSO 用同一家、同一個帳號）。Logto 的簡訊 connector 只能給 SSO 自己的登入流程用，後端無法借用。
- 發驗證碼要做頻率限制，超過回 `TOO_MANY_ATTEMPTS`（同「OTP 通用規則」）。

### POST /receipts/otp

發送驗證碼到選定的聯絡方式（email 寄信、手機發簡訊）。重新發送也是呼叫這支。

- Request：`{ "channel": "email" | "phone", "year"?: number }`
  - 不帶 email、手機，由後端用會員資料（SSO 帳號上已驗證的）決定寄送對象。
  - `year` 設計未決定（文案寫「該年度」但沒有選擇），不帶由後端決定（前端目前不帶）。
- Response 200：

  ```json
  { "expiresIn": 300, "length": 4, "sentTo": { "channel": "email | phone", "destination": "a***@gmail.com" } }
  ```

  `sentTo.destination` 為後端遮罩後的寄送對象（例 `a***@gmail.com`、`0912***678`，格式同 #49 個人資訊修改），前端顯示「驗證碼已寄到…」。
- 錯誤：
  - `VALIDATION_ERROR`：`channel` 缺漏或不是 `email`／`phone`；會員沒有這個聯絡方式（`fields.channel`，例：`{ "channel": "會員資料沒有手機" }`）
  - `TOO_MANY_ATTEMPTS`：發送頻率限制

### POST /receipts/send

驗證 OTP 並寄出收據。

- Request：`{ "channel": "email" | "phone", "otp": string, "year"?: number }`（`channel`、`year` 與發送驗證碼時相同）
- 寄出：
  - `email`：產生加密 PDF（密碼規則見上方）附在信裡寄出。
  - `phone`：建立一筆下載連結（`id` 請用無法猜測的隨機值，例如 128 bit 以上），記錄擁有者、年度、到期時間（寄出後 1 小時），簡訊只寄下載頁網址 `https://<會員中心>/receipt/download/{id}`。
- Response 200：

  ```json
  {
    "sentTo": { "channel": "email | phone", "destination": "0912***678" },
    "passwordRule": "ID_NUMBER | BIRTH_DATE",
    "linkExpiresAt": "ISO 8601（只有 phone）"
  }
  ```

  - `passwordRule`：`ID_NUMBER` = 身分證字號；`BIRTH_DATE` = 沒有身分證字號，改用出生年月日 8 碼。前端完成頁依此顯示「密碼為…」。
- 錯誤：`OTP_INVALID`、`OTP_EXPIRED`（含沒有對應的發送紀錄、`channel` 與發送時不同）、`NO_RECORDS`、`VALIDATION_ERROR`

### 下載頁（簡訊連結，#50）

前端頁面 `/receipt/download/{id}` 在需登入的路由下：未登入會先到登入頁，登入後回到這頁。以下 API 都需登入，檢查順序：找不到 → 不是本人 → 過期。

#### GET /receipts/downloads/{id}

查詢下載連結狀態（開頁時呼叫，1 小時內可重複開啟）。

- Response 200：`{ "year": number, "expiresAt": "ISO 8601（連結到期時間）", "passwordRule": "ID_NUMBER | BIRTH_DATE" }`
- 錯誤：
  - `RECEIPT_NOT_FOUND`（404）：沒有這個 id
  - `FORBIDDEN`（403）：連結不屬於目前登入的會員
  - `LINK_EXPIRED`（410）：超過寄出後 1 小時。前端顯示「連結已過期，請重新申請」與回收據頁的按鈕

#### POST /receipts/downloads/{id}/file

按「下載」時取得檔案網址。每次呼叫即時產生，**5 分鐘內有效**（例如雲端儲存的簽章網址；檔案本身仍是加密 PDF）。

- Response 200：`{ "url": string, "expiresIn": 300, "fileName": "奉獻收據-2025.pdf" }`
  - 前端用 `<a href={url} download={fileName}>` 觸發下載，不經過 API client（不帶 Bearer token）。跨網域的簽章網址請由儲存端回 `Content-Disposition: attachment; filename*=UTF-8''...` 決定檔名。
  - 檔案網址只在這支回應裡出現，不寫進簡訊或網址列。
- 錯誤：同 `GET /receipts/downloads/{id}`（例如開著頁面超過 1 小時才按下載 → `LINK_EXPIRED`）

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

單筆退回，附退回原因（#48，架構整理 D10）。

- Request：`{ "reason": string }`（必填，前端上限 200 字）
- Response 204
- 錯誤：`MEMBER_NOT_FOUND`、`ALREADY_PROCESSED`、`VALIDATION_ERROR`（沒填原因）
- 退回原因會顯示給申請者（`GET /me/registration` 的 `rejectReason`），並附在退回通知；申請者可修改後重新送出（`POST /me/registration`）。

---

## 設計尚未決定、後端需要一起確認的事項

- 登入過度頻繁／帳號鎖定的門檻與時間；鎖定後教會解鎖並寄信的後台流程。
- OTP 送達方式、長度、有效時間，以及修改信箱／手機時寄到舊或新位置。
- 密碼規則；Line 建立的帳號沒有密碼時能否走忘記密碼流程。
- Line OAuth 的 callback 處理與「接回一般創建流程」的步驟。
- 奉獻收據的年度（目前前端不帶 `year`，由後端決定；稿中沒有年度選擇）。
- 會員審核的資料範圍（區長只看自己牧區？「區長以上」的角色清單）。
- 會員資料申請（#48）：被退回重新送出時身分證字號是否要重新輸入（目前前端要求重新輸入）；寫回 SSO 失敗（例如 SSO 暫時無法連線）時的處理。
- 個人資訊修改寫回 SSO（#49）：刪除 email／手機時驗證碼寄到哪裡（留下的那一個？）；寫回 SSO 失敗時的處理；#48 補填聯絡方式的「已被使用」目前回 `ALREADY_REGISTERED`，是否也改成 `CONTACT_IN_USE`。
