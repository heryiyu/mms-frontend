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
- Passkey：2026-10-15 決定保留（Logto 已開按鈕與自動填入），這包還沒做，見 #63
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
- **社群登入**（`components/SocialButtons.tsx` → `pages/SocialCallback.tsx`，流程在 `social.ts`）：`initInteraction('SignIn')` → `createSocialAuthorizationUri(connectorId, state, socialCallbackUrl(connectorId))` → 轉到 `authorizationUri`；回到 `/callback/:connectorId` 後 `verifySocial(connectorId, 網址參數＋redirectUri, verificationId)` → `identify(verificationId)`；找不到帳號（`user.identity_not_exist`）時 `updateInteractionEvent('Register')` 再 `identify`。`verificationId` 和 `state` 在轉址前存 sessionStorage。登入頁「快速登入」和註冊頁「創建帳號」流程相同，只差按鈕文字。社群帳號沒有 email／手機（`user.missing_profile`）時目前只顯示提示、引導改用 email／手機註冊。

## 還沒實測的事（正式 SSO 不能寄驗證碼、建帳號、試密碼，本機也走不完 Line／Google 授權）

第一次在正式環境走過時確認，並更新程式裡的 `TODO(#47)` 與 `api/errors.ts` 的「實測」註記：

- **姓名（fullname）送出格式**：先送平的 `{ givenName, familyName }`，被拒或 identify 仍缺資料時改送 `{ fullname: { … } }`（`register/registerFlow.ts`）。成功註冊後到後台確認 profile 有姓名，刪掉用不到的格式。
- **註冊時 identify 的檢查順序**：推測先檢查帳號重複、再回缺資料（`registerFlow.ts` 的 `verifyRegisterCode`）。
- **驗證碼位數與時效**：用 Logto 預設 6 碼、10 分鐘（`verificationCode.ts`），收到實際驗證信／簡訊時確認；後台改設定時要一起改。
- **密碼錯誤碼**：密碼不符規則可能是 `password.rejected`（含 `data.result` 細項）或規格寫的 `user.password_policy_violation`；`user.same_password` 也未實測。
- **社群帳號缺 email／手機**：不做「補填並驗證」，因為 Google 帳號一定有 email、Line 帳號一定有手機（2026-10-14 決定）。萬一 Logto 仍回 `user.missing_profile`，`pages/SocialCallback.tsx` 只提示改用 email／手機註冊；第一次實際用 Line 註冊時確認 Logto 有拿到手機。
- 其他沒標「實測」的錯誤碼見 `api/errors.ts`。

## Cloudflare 分流（上線時，細節待和 IT 確認，#43）

`/api/*`、`/oidc/*`、`/.well-known/*` 照舊給 Logto，其他路徑（含 `/sso-assets/*`、`/favicon.ico`、`/logo.svg`）給這包，未知路徑回 `index.html`（SPA）。這包的靜態檔放在 `/sso-assets/`，不和 Logto 原本登入頁的 `/assets/` 撞在一起。
