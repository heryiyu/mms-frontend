# 新的 SSO 登入頁（#47）

取代 `sso.newlife.org.tw` 原本 Logto 的登入頁。和會員中心共用 `src/` 的 theme、元件、`GuestLayout`，但另外 build 成一包靜態網頁（`dist-sso/`），不帶 PWA、MSW、Logto SDK。

| 檔案 | 用途 |
|---|---|
| `vite.sso.config.ts` | 這包的 Vite 設定（root 是 `sso/`，dev 5174，proxy 到真的 SSO） |
| `sso/index.html`、`sso/main.ts` | HTML 入口（入口檔要在 root 底下，dev server 才找得到） |
| `sso/public/` | 這包自己的圖示（會員中心的 `public/` 有 PWA 與 MSW 檔案，不共用） |
| `src/sso/main.tsx` | React 入口 |
| `src/sso/routes.tsx`、`paths.ts` | 路由；路徑要和 Logto 原本登入頁一致（Logto 會導到這些路徑） |
| `src/sso/api/client.ts` | 呼叫 Experience API 的共用入口（取代會員中心的 `src/api/client.ts`） |
| `src/sso/api/experience.ts` | Experience API 各端點 |
| `src/sso/api/errors.ts` | 錯誤碼 → 中文提示（依主題分組，註明哪些實測過） |
| `src/sso/identifier.ts` | 「電子信箱或手機」欄位 → identifier（手機轉 Logto 的 886 格式）、驗證規則 |
| `src/sso/verificationCode.ts` | 驗證碼位數與時效（給 `useOtpForm`）、驗證碼錯誤分類（要清空重填／要重新發送）；註冊、忘記密碼共用 |
| `src/sso/useSsoNotice.ts` | 各頁的「通知」彈窗；`notifyError` 顯示錯誤提示，`session.not_found` 關閉後回會員中心登入頁 |
| `src/sso/usePageRestored.ts` | 轉址離開後按上一頁、bfcache 還原時收起 loading |
| `src/sso/social.ts` | 社群登入：connector ID、轉址前後的 sessionStorage 暫存、導回後的呼叫順序 |
| `src/sso/passkey.ts`、`usePasskeySignIn.ts`、`webauthn.ts` | 通行密鑰（#63）：Logto 設定、登入與建立的呼叫順序；登入頁按鈕＋自動填入的 hook；瀏覽器 WebAuthn 支援判斷與 JSON ↔ ArrayBuffer 轉換 |
| `src/sso/components/PasskeyButton.tsx`、`PasskeySetup.tsx` | 「通過通行密鑰繼續」按鈕；「要建立通行密鑰嗎？」詢問畫面（submit 回 `user.passkey_preferred` 時，登入、註冊、社群導回都會用到） |
| `src/sso/components/SocialButtons.tsx` | Line、Google 按鈕（登入頁「快速登入」、註冊頁「創建帳號」） |
| `src/sso/register/` | 註冊兩個步驟（`AccountStep` 帳號＋驗證碼、`ProfileStep` 姓名＋密碼＋條款）與呼叫順序（`registerFlow.ts`） |
| `src/sso/pages/` | `SignIn` 登入、`Register` 註冊、`ResetPassword` 忘記密碼、`SocialCallback` 社群導回、`ToMemberCenter`（沒有進行中的登入）、`SsoNotFound`；頁內步驟在同一路徑切換 |

和會員中心共用的畫面元件（#47 D12，改設計時兩邊一起變）：

| 元件 | SSO 用在 | 會員中心用在 |
|---|---|---|
| `components/LoginView`（`LoginView`、`useLoginSubmit`、`LoginLoading`） | 登入頁、社群導回頁的 loading | 登入頁 |
| `components/RegisterCard`（`RegisterCard`、`RegisterBackLink`、`RegisterDivider`） | 註冊兩個步驟 | 註冊第一步 |
| `components/ForgotPasswordCard`（`ForgotPasswordCard`、`NewPasswordForm`、`PasswordChangedResult`） | 忘記密碼 | 忘記密碼、進度查詢（只用卡片版面） |
| `components/OtpInput` 的 `OtpFormItem` | 註冊、忘記密碼的驗證碼列 | 註冊、忘記密碼、進度查詢 |
| `components/SocialLoginButton` | `SocialButtons` 的按鈕樣式 | 登入、註冊的 Line 按鈕 |
| `layouts/GuestLayout` | 全部頁面（忘記密碼完成頁用 `none` 變體） | 登入、註冊、忘記密碼等 |

`GuestLayout` 的三種變體（`card`／`full`／`none`）輸出同一組元素、只換 class，切換變體時頁面不會重新掛載，同一路徑內換步驟用一般的 state 即可。

## 指令（在 `frontend/` 下）

- `npm run dev:sso`：開 http://localhost:5174
- `npm run build`：會員中心和這包一起 build；只 build 這包用 `npm run build:sso`
- `npm run preview:sso`：預覽 build 結果（沒有 proxy，只能看畫面）

## 不能引入的東西

`vite.sso.config.ts` 的 `forbidMemberCenterImports` 在 build 時檢查，引入下列模組會直接失敗：

- `src/api/client.ts`、`src/auth/*`：會連帶打包 Logto SDK 和會員中心的登入狀態。要用 `ApiError`／`isApiError` 就 import `src/api/errors.ts`。
- `src/mocks/*`、`msw`

共用元件（`components/form`、`components/OtpInput` 等）已確認可以用。`OtpInput` 的 `getOtpErrorMessage`、`useOtpSender` 是照會員中心後端的錯誤碼和回應格式寫的，這包要自己把 Experience API 的錯誤轉成提示（`api/errors.ts`）。

## 本機怎麼接真的 SSO

Experience API 用 Logto 網域的 cookie 記住「進行到哪一步」（interaction），所以登入頁要和 Logto 在同一個網域。開發時 `npm run dev:sso` 會把 `/api`、`/oidc`、`/.well-known` 轉給 `VITE_SSO_PROXY_TARGET`（預設 `https://sso.newlife.org.tw`），瀏覽器看起來全部都在 `localhost:5174`。2026-10-14 實測可以拿到 cookie、呼叫 API。

**從會員中心串起來測**：在 `.env.local` 加 `VITE_LOGTO_DEV_SIGN_IN_ORIGIN=http://localhost:5174`，重開會員中心的 dev server（5173，要是 Logto 模式），同時開 `npm run dev:sso`。會員中心按登入時會改跳 `localhost:5174/oidc/auth`，走完新登入頁後回到 `localhost:5173/callback`；換 token 仍直接打真的 SSO，所以會員中心能正常完成登入。

**只測登入頁**：直接開 `http://localhost:5174/oidc/auth?client_id=b5kogsym8n3892qxesg6f&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fcallback&response_type=code&scope=openid&state=x&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256`（可加 `&first_screen=register`、`reset_password`）。最後回到會員中心時 state 對不上會顯示登入失敗，但網址上有 `code=` 就代表登入頁這段成功了。

注意：

- 這是正式 SSO，註冊會建立真的帳號、密碼錯誤會累計鎖定次數，測試帳號用完請 IT 刪除。
- 社群登入在本機測不了：Line、Google 後台只登記了 SSO 網域的 callback（`https://sso.newlife.org.tw/callback/<connectorId>`）。要本機測，需請 IT 在 Line／Google 後台加 `http://localhost:5174/callback/<connectorId>`。
- Logto 回的轉址如果是 SSO 完整網址，proxy 和 `goToRedirect` 都會改成本機路徑，才不會跳離本機的 cookie。

## Logto 現況（2026-10-14 從 `/api/.well-known/sign-in-exp` 查）

- 登入：email 或手機＋密碼（`signIn.methods`）
- 註冊：email 或手機擇一、要驗證、要設密碼（`signUp`）；另有必填的自訂欄位 `fullname`（2026-10-14 #56 再查：開了 `givenName`「名字」與 `familyName`「姓氏」，皆必填），註冊時用 `addProfile({ type: 'extraProfile', values })` 送，格式未實測（推測與 fallback 見 `register/registerFlow.ts`，#56）
- 社群：Line（`f51kym2gm36loxptokqok`）、Google（`uvxuux7ej7b5pc0jx8hcm`），自動連結同 email 帳號；Google One Tap 有開
- 忘記密碼：email、手機都可以
- 條款：只在一般註冊時要勾（`agreeToTermsPolicy: ManualRegistrationOnly`）；條款網址目前指向 `member.newlife.org.tw/terms`、`/privacy`
- 密碼錯誤鎖定（`sentinelPolicy`）：2026-10-15 已設成錯 3 次停 5 分鐘（`maxAttempts: 3`、`lockoutDuration: 5`）
- Passkey（通行密鑰）：2026-10-15 決定保留，`passkeySignIn` 的 `enabled`、`showPasskeyButton`、`allowAutofill` 都是 true，做法見下方「通行密鑰」（#63）。沒有「註冊後要不要詢問」的開關：`enabled` 為 true 就會問（見下方）
- 版本：Logto 不對外公開版本號（API 規格寫 `Cloud`），錯誤碼以實測為準
- 沒有進行中的登入就開登入頁時，Logto 會轉到 `unknownSessionRedirectUrl`（`https://member.newlife.org.tw/login`），這包的 `/`、`/unknown-session` 也照做（轉到 `VITE_SSO_MEMBER_CENTER_URL` 的登入頁）

## 各流程的做法

都要先由 `/oidc/auth` 進來（Logto 會設 interaction cookie），否則一律回 `session.not_found`。`initInteraction` 會清掉先前的驗證紀錄，同一個流程只在開始時呼叫一次。

共通做法：

- 伺服器回的錯誤一律跳「通知」彈窗（`useSsoNotice().notifyError`，文字來自 `api/errors.ts`）；`session.not_found`（直接開網址、逾時）關閉彈窗後回會員中心登入頁重新發起登入。欄位格式、兩次密碼不一致、`password.rejected` 才用欄位下方的訊息。
- 送出中按鈕 loading、不重複送出；成功後轉址期間維持 loading，按上一頁由 bfcache 還原時收起（`usePageRestored`）。
- 驗證碼列用會員中心的 `useOtpForm`＋`OtpFormItem`，位數與時效用 `verificationCode.ts` 的固定值；驗證碼錯誤清空重填，過期／錯太多次／找不到發送紀錄回到「尚未發送」重新寄。
- 成功後 `goToRedirect(redirectTo)`：Logto 回的若是 SSO 完整網址，改成本機路徑。

各流程：

- **登入**（`pages/SignIn.tsx`，畫面用 `LoginView`）：`initInteraction('SignIn')` → `verifyPassword` → `identify(verificationId)` → `submitInteraction()` → `goToRedirect`。收到 `session.verification_blocked_too_many_attempts` 後前端 5 分鐘內直接擋（`useLoginSubmit`）；`user.suspended` 顯示聯繫教會信箱。「or」下方放 `SocialButtons`（同會員中心 Line 按鈕的位置）。
- **註冊**（`pages/Register.tsx`，兩步都在 `/register`）：
  1. `AccountStep`：email 或手機擇一 →「確認」寄碼（`initInteraction('Register')` → `sendVerificationCode`）→ 填碼 →「確認」`verifyCode` → `identify`（新帳號回 `user.missing_profile` 視為通過；已註冊回 `user.*_already_in_use`）。寄碼前下方有「or」＋`SocialButtons action="register"`，寄出後收起（同會員中心）。
  2. `ProfileStep`：姓氏、名字、密碼、確認密碼、同意條款 → `addProfile` 密碼 → `addProfile` 姓名（`extraProfile`，格式見下方待實測）→ `identify` → `submitInteraction()` → `goToRedirect`。驗證已失效時回第一步。
- **忘記密碼**（`pages/ResetPassword.tsx`，畫面同會員中心忘記密碼頁，帳號改成 email 或手機擇一）：`initInteraction('ForgotPassword')` → `sendVerificationCode` → `verifyCode` → `identify` → 設定新密碼 `resetPassword` → `submitInteraction()` → 整頁「變更完成！」（GuestLayout `none` 變體）→「返回」回登入頁。不直接 `goToRedirect`：ForgotPassword 的 submit 只改密碼不登入，使用者要用新密碼再登入一次。
- **通行密鑰登入**（#63，`usePasskeySignIn.ts`、`passkey.ts`，見下方「通行密鑰」）：`preflightPasskeySignIn()` → `navigator.credentials.get` → `initInteraction('SignIn')` → `verifyPasskeySignIn(credential)` → `identify(verificationId)` → `submitInteraction()` → `goToRedirect`。
- **社群登入**（`components/SocialButtons.tsx` → `pages/SocialCallback.tsx`，流程在 `social.ts`）：`initInteraction('SignIn')` → `createSocialAuthorizationUri(connectorId, state, socialCallbackUrl(connectorId))` → 轉到 `authorizationUri`；回到 `/callback/:connectorId` 後 `verifySocial(connectorId, 網址參數＋redirectUri, verificationId)` → `identify(verificationId)`；找不到帳號（`user.identity_not_exist`）時 `updateInteractionEvent('Register')` 再 `identify`。`verificationId` 和 `state` 在轉址前存 sessionStorage。登入頁「快速登入」和註冊頁「創建帳號」流程相同，只差按鈕文字。社群帳號沒有 email／手機（`user.missing_profile`）時目前只顯示提示、引導改用 email／手機註冊。

## 通行密鑰（Passkey，#63）

照 Logto 預設登入頁做（規格：`/api/.well-known/experience.openapi.json`；做法對照 Logto 原始碼 `packages/experience` 的 `use-passkey-sign-in`、`use-passkey-autofill-conditional-ui`、`PasskeySetup`，2026-10-15 查）。

**登入頁**（`pages/SignIn.tsx`）：

- Line、Google 下方「通過通行密鑰繼續」（`components/PasskeyButton.tsx`，文字是 Logto zh-TW「通過 {{name}} 繼續」＋「通行密鑰」，去掉中文間的空白；圖示用 Bootstrap Icons `person-lock`，沒有 passkey 圖示）。帳號欄位 `autocomplete="username webauthn"`，支援的瀏覽器會在建議清單列出通行密鑰（自動填入）。
- 設定從 `GET /api/.well-known/sign-in-exp` 的 `passkeySignIn` 讀（`passkey.ts` 的 `loadPasskeySettings`，一頁只查一次；回應 gzip 後約 47KB，大多是社群圖示）：`enabled` 為 false 全關、`showPasskeyButton` 控制按鈕、`allowAutofill` 控制自動填入。瀏覽器不支援 WebAuthn 時不查設定、都不顯示。查不到設定時當作全關。
- 頁面載入就 `POST /api/experience/preflight/sign-in-passkey/authentication`（不需帳號）取 options，按鈕與自動填入共用；送去驗證一次就重新取（Logto 只記得最後一次的 challenge，所以同時只發一個 preflight）。challenge 存在 interaction 的另一欄，之後 `initInteraction` 不會清掉，所以 `initInteraction('SignIn')` 放在拿到 credential 之後（同 Logto）。
- 同一時間只有一個 `navigator.credentials.get`：按下按鈕先 abort 自動填入的 conditional 請求，按鈕流程結束（取消、失敗）再重新啟動；離開頁面時 abort；密碼登入後要詢問建立時也停掉。
- verify 不帶 `verificationId`（用 preflight 的 challenge），Logto 依 credential 找出帳號。`POST /verification/sign-in-passkey/authentication`（帶帳號、非 discoverable）沒用，Logto 預設登入頁也只在「先輸入帳號」的流程用。`/verification/web-authn/authentication` 是兩步驟驗證用的，不是登入。
- 錯誤：使用者取消（`NotAllowedError`）安靜回到原狀；瀏覽器為了隱私，「這台裝置沒有通行密鑰」通常也是 `NotAllowedError`，分不出來。驗證失敗、找不到帳號、帳號停用等用通知彈窗（`api/errors.ts`「通行密鑰」，全部未實測）。頁面載入時 preflight 失敗不跳錯，按按鈕時才提示。

**建立通行密鑰（詢問畫面）**：Logto 開了通行密鑰登入時，`submit` 會檢查帳號有沒有通行密鑰：沒有、也沒略過過就回 **422 `user.passkey_preferred`**。這不只在註冊，**密碼登入、社群登入的 submit 也會回**（Logto 只對企業 SSO 不問；原始碼 `experience-interaction.ts` 的 `assertPasskeySignInFulfilled`），所以登入頁、註冊第二步、社群導回頁都接這個碼，改顯示 `components/PasskeySetup.tsx`「要建立通行密鑰嗎？」：

- 建立：`POST /verification/web-authn/registration`（畫面一出現就先取 options，按下時才能直接叫出系統視窗，Safari 要求緊接在點擊之後）→ `navigator.credentials.create` → `POST /verification/web-authn/registration/verify` → `POST /profile/mfa/passkey`（綁成「登入用」通行密鑰；`POST /profile/mfa` type WebAuthn 會開啟兩步驟驗證，不用）→ `submit` → 轉址。
- 略過：`POST /profile/mfa/passkey-skipped` → `submit` → 轉址。註冊時只對這次有效（下次登入還會問一次）；登入時 Logto 記在帳號上，之後不再問。
- 這時帳號已建立（註冊的 `identify` 就建立帳號）或密碼已驗證，只差 submit：取消建立安靜留在原畫面、建立失敗跳提示後可以再試或略過，都不影響註冊／登入完成。
- 瀏覽器不支援 WebAuthn：不顯示詢問，直接略過（注意：登入時這會讓 Logto 記住「略過」，之後換支援的瀏覽器也不再問）。
- 想完全不問：只能把 Logto 後台的通行密鑰登入整個關掉（`passkeySignIn.enabled`），沒有單獨的開關。

**網域（RP ID）**：preflight 與 registration 的 `rpId` 是 Logto 收到請求的網域，也就是 `sso.newlife.org.tw`；通行密鑰綁這個網域。上線後新登入頁直接放在 Logto 映像裡（同網域，見下方「上線方式」），已在 Logto 原本登入頁建立的通行密鑰照常可用。本機 `localhost:5174` 經 proxy 拿到的 options 是 `sso.newlife.org.tw` 的，瀏覽器會拒絕（`SecurityError`）：本機無法用真的通行密鑰測，按鈕會跳「無法使用通行密鑰」、自動填入安靜不啟動。測試用假造 API 回應＋假造或 CDP 虛擬驗證器（e2e `sso-passkey.mjs`）。

## 還沒實測的事（正式 SSO 不能寄驗證碼、建帳號、試密碼，本機也走不完 Line／Google 授權）

第一次在正式環境走過時確認，並更新程式裡的 `TODO(#47)` 與 `api/errors.ts` 的「實測」註記：

- **姓名（fullname）送出格式**：先送平的 `{ givenName, familyName }`，被拒或 identify 仍缺資料時改送 `{ fullname: { … } }`（`register/registerFlow.ts`）。成功註冊後到後台確認 profile 有姓名，刪掉用不到的格式。
- **註冊時 identify 的檢查順序**：推測先檢查帳號重複、再回缺資料（`registerFlow.ts` 的 `verifyRegisterCode`）。
- **驗證碼位數與時效**：用 Logto 預設 6 碼、10 分鐘（`verificationCode.ts`），收到實際驗證信／簡訊時確認；後台改設定時要一起改。
- **密碼錯誤碼**：密碼不符規則可能是 `password.rejected`（含 `data.result` 細項）或規格寫的 `user.password_policy_violation`；`user.same_password` 也未實測。
- **社群帳號缺 email／手機**：不做「補填並驗證」，因為 Google 帳號一定有 email、Line 帳號一定有手機（2026-10-14 決定）。萬一 Logto 仍回 `user.missing_profile`，`pages/SocialCallback.tsx` 只提示改用 email／手機註冊；第一次實際用 Line 註冊時確認 Logto 有拿到手機。
- **通行密鑰**（#63，本機無法實測，上線到 `sso.newlife.org.tw` 後確認）：
  - 用 Logto 原本登入頁建立過的通行密鑰，在新登入頁按鈕、自動填入（iPhone Safari、Android Chrome、Windows Edge／Chrome）都能登入
  - 註冊完成、密碼登入（還沒有通行密鑰的帳號）、Line／Google 登入後真的出現「要建立通行密鑰嗎？」；建立後下次可用通行密鑰登入，會員中心不受影響；略過的行為（註冊只略過一次、登入記住）
  - 錯誤碼：驗證失敗、通行密鑰已從帳號移除（推測回 `session.identifier_not_found`）、帳號停用、`user.passkey_preferred` 的實際 HTTP 狀態
  - Safari：按鈕先取好 options 再叫系統視窗，確認不會因「不是使用者點擊」被擋
- 其他沒標「實測」的錯誤碼見 `api/errors.ts`。

## 上線方式（#43）

`logto/Dockerfile` 先 `npm run build:sso`，再把 `dist-sso/` 換進 Logto 官方映像、取代內建登入頁的檔案；Railway 的 Logto 服務改從本 repo 用這個 Dockerfile 部署。Railway 設定、退回方式、升級 Logto 見 `logto/README.md`。

- `/api/*`、`/oidc/*` 等照舊由 Logto 處理。其他路徑：dist 裡有的檔名（`/sso-assets/*`、`/favicon.ico`、`/logo.svg`）回那個檔案，其他一律回 `index.html`，由 `routes.tsx` 的路由決定畫面（不認得的走 `*` → `SsoNotFound`）。**新增路徑只要改 `paths.ts`、`routes.tsx`**，不用改映像或 Railway。
- 沒有進行中的登入時開 `/`、`/sign-in`、`/register`、`/forgot-password`，Logto 在回網頁前就轉到 `unknownSessionRedirectUrl`，不會進到這包。
- 這包的靜態檔放在 `/sso-assets/`，不和 Logto 原本登入頁的 `/assets/` 混在一起。
- 會員中心網址（`VITE_SSO_MEMBER_CENTER_URL`）在 build 時決定：Railway 的服務變數有設就用，沒設用 `paths.ts` 的預設值。
- 新頁沒做的 Logto 頁面（MFA、第三方授權同意頁、企業 SSO 等）會顯示「找不到這個頁面」，這些功能在 Logto 後台不要開。
