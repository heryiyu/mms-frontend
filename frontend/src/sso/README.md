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
| `src/sso/api/errors.ts` | 錯誤碼 → 中文提示 |

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
- 註冊：email 或手機擇一、要驗證、要設密碼（`signUp`）；另有必填的自訂欄位 `fullname`（只開 `givenName`，說明「請填寫您的本名」），註冊時要用 `addProfile({ type: 'extraProfile', values })` 送，格式待實測
- 社群：Line（`f51kym2gm36loxptokqok`）、Google（`uvxuux7ej7b5pc0jx8hcm`），自動連結同 email 帳號；Google One Tap 有開
- 忘記密碼：email、手機都可以
- 條款：只在一般註冊時要勾（`agreeToTermsPolicy: ManualRegistrationOnly`）；條款網址目前指向 `member.newlife.org.tw/terms`、`/privacy`
- **還沒改**：Passkey 仍開著；密碼錯誤鎖定（`sentinelPolicy`）是預設值，還沒設成錯 3 次停 5 分鐘（#47 前置，要請 IT 設定）
- 版本：Logto 不對外公開版本號（API 規格寫 `Cloud`），錯誤碼以實測為準
- 沒有進行中的登入就開登入頁時，Logto 會轉到 `unknownSessionRedirectUrl`（`https://member.newlife.org.tw/login`），這包的 `/`、`/unknown-session` 也照做（轉到 `VITE_SSO_MEMBER_CENTER_URL` 的登入頁）

## 常見呼叫順序

都要先由 `/oidc/auth` 進來（Logto 會設 interaction cookie），否則一律回 `session.not_found`。

- **登入**：`initInteraction('SignIn')` → `verifyPassword` → `identify(verificationId)` → `submitInteraction()` → `goToRedirect(redirectTo)`
- **註冊**：`initInteraction('Register')` → `sendVerificationCode(identifier, 'Register')` → `verifyCode` → `identify(verificationId)`（回 `user.missing_profile` 時依 `data.missingProfile` 用 `addProfile` 補密碼、姓名，再 `identify()`）→ `submitInteraction()`
- **忘記密碼**：`initInteraction('ForgotPassword')` → `sendVerificationCode(identifier, 'ForgotPassword')` → `verifyCode` → `identify(verificationId)` → `resetPassword(newPassword)` → `submitInteraction()`
- **社群登入**：`initInteraction('SignIn')` → `createSocialAuthorizationUri(connectorId, state, socialCallbackUrl(connectorId))` → 轉到 `authorizationUri`；回到 `/callback/:connectorId` 後 `verifySocial(connectorId, 網址參數, verificationId)` → `identify(verificationId)`；找不到帳號（`user.identity_not_exist`）時 `updateInteractionEvent('Register')` 再 `identify(verificationId)`。社群帳號沒有 email／手機時會要求補（`user.missing_profile`）。`verificationId` 和 `state` 要在轉址前存 sessionStorage。

`initInteraction` 會清掉先前的驗證紀錄，同一個流程只在開始時呼叫一次。

## Cloudflare 分流（上線時，細節待和 IT 確認，#43）

`/api/*`、`/oidc/*`、`/.well-known/*` 照舊給 Logto，其他路徑（含 `/sso-assets/*`、`/favicon.ico`、`/logo.svg`）給這包，未知路徑回 `index.html`（SPA）。這包的靜態檔放在 `/sso-assets/`，不和 Logto 原本登入頁的 `/assets/` 撞在一起。
