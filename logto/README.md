# NLC SSO 的 Logto 映像（#43）

`sso.newlife.org.tw` 跑的是自架 Logto。這個資料夾的 `Dockerfile` 做出一個「Logto 官方映像＋換掉內建登入頁」的映像：

1. 先在 `frontend/` 跑 `npm run build:sso`，做出新的登入頁（`frontend/dist-sso/`，程式在 `frontend/src/sso/`）。
2. 拿官方的 `ghcr.io/logto-io/logto:1.42.0`，把裡面內建登入頁的檔案整個刪掉，換成上一步的檔案。

Logto 本身（API、OIDC、資料庫、後台 Console）完全沒改，啟動方式也一樣，只是使用者看到的登入、註冊、忘記密碼畫面變成新頁。登入頁和 Logto 在同一個網址底下，所以不需要另外架網站或設定 Cloudflare 分流。

## 運作方式

- Logto 正式環境從 `/etc/logto/packages/core/node_modules/@logto/experience/dist` 提供登入頁；那是指向 `/etc/logto/packages/experience` 的捷徑（symlink），實際檔案在 **`/etc/logto/packages/experience/dist`**（2026-10-16 在 1.42.0 映像裡確認）。Dockerfile 換的就是這個資料夾，換之前會先檢查路徑，Logto 哪天改了目錄結構，build 會直接失敗，不會默默上線舊頁面。
- `/api/*`、`/oidc/*` 等 Logto 自己的路徑照舊由 Logto 處理。其他路徑：檔名對得到（`/sso-assets/*`、`/favicon.ico`、`/logo.svg`）就回那個檔案，對不到就一律回新頁的 `index.html`，由 `frontend/src/sso/routes.tsx` 決定要顯示哪一頁（不認得的路徑顯示「找不到這個頁面」）。所以**新登入頁要加路徑時，這裡什麼都不用改**。
- 沒有進行中的登入就開 `/`、`/sign-in`、`/register`、`/forgot-password` 時，Logto 在回網頁之前就先把人轉到後台設定的 `unknownSessionRedirectUrl`（目前是會員中心登入頁），這點和換頁前一樣。
- Logto 後台「登入體驗」裡的品牌顏色、Logo、自訂 CSS 不會影響新頁（新頁的樣子在 `frontend/` 改）；後台的登入／註冊方式、社群連接器、密碼規則等設定照樣有效。後台的「Bring your own UI（自訂 UI）」不要上傳東西，有上傳的話 Logto 會改用那包，蓋過這個映像。

## Railway 設定（第一次切換）

在 Railway 的 Logto 服務（目前 Source 是 Image `ghcr.io/logto-io/logto:1.42.0`）：

1. **Settings → Source**：把 Source Image 斷開（Disconnect），改接 GitHub repo **`NLC-Ministry/mms-frontend`**，Branch 選 **`main`**。Root Directory 留空（build 要用整個 repo）。
2. **Variables**：新增 **`RAILWAY_DOCKERFILE_PATH`** = **`logto/Dockerfile`**。其他變數（`DB_URL`、`ENDPOINT`、`ADMIN_ENDPOINT`、`TRUST_PROXY_HEADER` 等）不要動。
   - 選用：`VITE_SSO_MEMBER_CENTER_URL` = 會員中心網址（例如 `https://member.newlife.org.tw`），決定登入頁的條款連結、逾時回去的地方；沒設就用預設的 `https://member.newlife.org.tw`。這是 build 時寫進網頁的，改了要重新部署才生效。
3. **Settings → Build → Watch Paths**：填 `/logto/**`、`/frontend/**`、`/.dockerignore`。只有這些檔案變動才重新部署 Logto；改 `docs/`、`backend/` 不會。（會員中心和新登入頁共用 `frontend/src/`，所以會員中心的改動也會讓 Logto 重新部署一次，不影響使用。）
4. **Settings → Deploy**：**Pre-deploy Command**（`npx @logto/cli db alteration deploy 1.42.0`）和 **Custom Start Command**（`npm start`）維持原樣。
5. 按 Deploy（或等它自動開始）。Build 約幾分鐘；Railway 會等新版 build 成功、Pre-deploy 跑完才切過去，build 失敗時舊的那版照常運作。
6. 部署完確認：
   - 會員中心按「登入」→ 出現新登入頁，帳號密碼能登入、Line／Google 能登入
   - `https://sso.newlife.org.tw/api/status` 正常（空白頁、沒有錯誤）
   - Logto 後台 Console 能開、能登入

之後 `main` 有合併到上述路徑的改動，Railway 就會自動重新 build、部署（合併前請先看 CI 是綠的）。

### 為什麼不用 railway.json

Railway 可以把上面的設定寫成 repo 裡的 `railway.json`（config as code），但 Railway 文件寫明這個功能已停用：既有的檔案只用到 2026-12-01，新服務不能用，改推 `.railway/railway.ts`（Infrastructure as Code）。為了不到年底又要改一次，先用後台手動設定（只有上面幾個欄位）。

## 怎麼退回原本的 Logto 登入頁

任一種都可以，資料庫不受影響（這個映像沒有改資料庫）：

- **最快**：Deployments 分頁找切換前、用 Image 部署的那一次 → 右邊「⋮」→ **Redeploy**（或 Rollback）。這只是暫時的：Source 還接著 repo，下次 `main` 有相關改動又會部署新頁。
- **長期退回**：Settings → Source 斷開 GitHub repo，改回 Image `ghcr.io/logto-io/logto:1.42.0`（版本要和 Pre-deploy Command 一樣），再部署。`RAILWAY_DOCKERFILE_PATH` 可以留著，用 Image 時不會用到。

## 升級 Logto

1. 改 `logto/Dockerfile` 的 `ARG LOGTO_VERSION=1.42.0`。
2. **同時**把 Railway 的 Pre-deploy Command 改成同一個版本號（`npx @logto/cli db alteration deploy <新版本>`）。兩邊不一致，資料庫結構會和程式對不上。
3. 先看 Logto 的 CHANGELOG 有沒有改 Experience API（`/api/experience/*`），新登入頁是照那組 API 寫的。
4. 依下方「本機測試」跑一次再合併。

## 新頁沒有的 Logto 頁面

新頁只做了登入、註冊、忘記密碼、社群登入導回（路徑見 `frontend/src/sso/paths.ts`）。Logto 原本還有下列頁面，現在開會顯示「找不到這個頁面」，所以**下列功能在 Logto 後台不要開**，要開之前得先在新頁補上：

- 兩步驟驗證（MFA）的驗證、綁定頁
- 第三方應用程式的授權同意頁（`/consent`）
- 企業 SSO（`/single-sign-on`）
- 其他 Logto 內建流程頁（例如補填資料、帳號連結）

## 本機測試（需要 Docker）

在 repo 根目錄：

```bash
docker build -f logto/Dockerfile -t nlc-logto-test .
docker network create nlc-logto-net
docker run -d --name nlc-logto-pg --network nlc-logto-net -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=p0stgr3s postgres:17-alpine
docker run -d --name nlc-logto-app --network nlc-logto-net -p 3001:3001 -p 3002:3002 \
  -e TRUST_PROXY_HEADER=1 \
  -e DB_URL=postgres://postgres:p0stgr3s@nlc-logto-pg:5432/logto \
  -e ENDPOINT=http://localhost:3001 -e ADMIN_ENDPOINT=http://localhost:3002 \
  --entrypoint sh nlc-logto-test -c 'npm run cli db seed -- --swe && npm start'
```

等 `http://localhost:3001/api/status` 回 204 後：

- 開 `http://localhost:3001/oidc/auth?client_id=demo-app&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fdemo-app&response_type=code&scope=openid&state=x&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256`（Logto 內建的 demo-app）→ 應該轉到 `/sign-in` 並顯示新登入頁。
- Console 在 `http://localhost:3002`。

測完清掉：

```bash
docker rm -f -v nlc-logto-app nlc-logto-pg
docker network rm nlc-logto-net
docker rmi nlc-logto-test
```
