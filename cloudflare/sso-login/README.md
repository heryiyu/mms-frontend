# SSO 新登入頁的分流 Worker（#43）

## 這是什麼

`sso.newlife.org.tw`（Logto）前面本來就有 Cloudflare。這裡是一支放在 Cloudflare 上的小程式（Worker），只攔「登入畫面」那幾個網址，決定要給**新登入頁**（`frontend/src/sso/`，#47）還是 **Logto 原本的登入頁**。帳號密碼的處理（`/api`、`/oidc`、`/.well-known`）完全不經過它，還是 Logto 自己做。

用到這個 SSO 登入的網站（會員中心、讀經 App、Member Hub）都會受影響，所以分三段：

| `MODE` | 誰看到新登入頁 |
|---|---|
| `preview`（目前） | 只有自己開了「預覽」的人；其他人照舊是 Logto 原頁 |
| `all` | 所有人（正式上線） |
| `off` | 沒有人，全部回 Logto 原頁（緊急切回） |

網址、cookie、通行密鑰都還是 `sso.newlife.org.tw`，所以切來切去不會讓人被登出，已建立的通行密鑰也照常能用。

## 開啟／關閉自己的預覽（`MODE` 是 `preview` 時）

- 開啟：開 <https://sso.newlife.org.tw/unknown-session?nlc_preview=1>（會跳到會員中心登入頁），之後從任何一個 App 按登入都會看到新登入頁。這台瀏覽器記住 30 天。
- 關閉：開 <https://sso.newlife.org.tw/sign-in?nlc_preview=0>（也會跳到會員中心登入頁）。
- 只對開了網址的那個瀏覽器有效；換瀏覽器、無痕視窗、手機要各開一次。
- 確認目前看到哪個：瀏覽器開發者工具 → Network → 點登入頁那筆 → Response Headers 的 `X-NLC-SSO`，`new` 是新頁、`logto` 是原頁。（cookie 名稱 `nlc_sso_preview`，HttpOnly，網頁的 JS 讀不到。）

## 第一次設定（只做一次）

1. **Cloudflare API token**：Cloudflare 後台右上頭像 → My Profile → API Tokens → Create Token → 範本「Edit Cloudflare Workers」→ Account Resources 選教會的帳號、Zone Resources 選 `newlife.org.tw`（只給這個網域）→ 建立後複製 token。
   - 範本包含 Workers Scripts（帳號）與 Workers Routes（網域）的編輯權限，部署 Worker 和設定路由都要；其他（KV、R2、Tail）用不到，想更嚴可以在範本裡刪掉，但 Account Settings Read、User Details Read、User Memberships Read 要留著（wrangler 會讀）。
2. **Account ID**：Cloudflare 後台點 `newlife.org.tw` 網域 → Overview 頁往下捲，右側「API」區塊的 **Account ID**（或 Workers & Pages 頁的 Account Details）。
3. **GitHub**：repo → Settings → Secrets and variables → Actions
   - Secrets 加 `CLOUDFLARE_API_TOKEN`（第 1 步的 token）
   - Variables 加 `CLOUDFLARE_ACCOUNT_ID`（第 2 步的 ID）
4. 到 Actions → 「Deploy SSO login」→ Run workflow 手動跑第一次。之後 main 上 `frontend/` 或這個資料夾有變動就會自動部署。
5. 部署完成後，Cloudflare 後台 `newlife.org.tw` → Workers Routes 會看到 `sso.newlife.org.tw/sign-in*` 等 12 條路由指向 `nlc-sso-login`。

**Line、Google 後台不用改**：新登入頁的社群登入導回網址和 Logto 原頁一樣，都是 `https://sso.newlife.org.tw/callback/<connectorId>`（Line `f51kym2gm36loxptokqok`、Google `uvxuux7ej7b5pc0jx8hcm`），這個路徑由 Worker 依同樣規則分給新頁或原頁。

## 正式上線

把 `wrangler.jsonc` 的 `"MODE": "preview"` 改成 `"all"`，開 PR 合併到 main，GitHub Actions 部署完（約 1～2 分鐘）就生效。

## 緊急切回 Logto 原頁

最快（幾秒內生效）：Cloudflare 後台 → Workers & Pages → `nlc-sso-login` → Settings → Variables and Secrets → 把 `MODE` 改成 `off` → Deploy。

更徹底：`newlife.org.tw` → Workers Routes → 刪掉指向 `nlc-sso-login` 的路由（Worker 就完全不經手，等於回到沒有這支程式的狀態）。

**之後一定要把 repo 也改掉**：下一次 GitHub Actions 部署會用 `wrangler.jsonc` 的內容覆蓋後台的 `MODE` 和路由。所以在後台切回後，請同時把 `wrangler.jsonc` 的 `MODE` 改成 `off` 合併進 main（或暫時停用「Deploy SSO login」workflow）。

## 免費方案額度

- Workers 免費方案每天 10 萬次請求（台灣時間每天早上 8 點歸零）。這裡只有「打開登入頁」那一下算一次；新登入頁的 JS、CSS、圖示（`/sso-assets/*`、`/favicon.ico`、`/logo.svg`）由 Cloudflare 直接給、不算次數（`run_worker_first` 排除了這些路徑）。以教會的登入量應該用不完。
- 超過額度時的行為依路由設定：Cloudflare 文件寫路由可選「fail open」（略過 Worker、直接給 Logto 原頁）或「fail closed」（顯示錯誤）。上線前請到 Workers Routes 編輯路由時確認，若有「Request limit failure mode」選 **Fail open**。

## 這支程式怎麼判斷

`src/worker.js`：

1. `/sso-assets/*`、`/favicon.ico`、`/logo.svg`：一律給新登入頁的檔案（Logto 沒有這些路徑）。
2. 網址有 `?nlc_preview=1` → 設 cookie `nlc_sso_preview=1`（30 天）；`?nlc_preview=0` → 清掉。這次的回應就照新的狀態。
3. `MODE` 是 `all` → 新頁；`off` → Logto；其他（`preview`）→ 有 cookie 才新頁。
4. 新頁：從 `frontend/dist-sso` 給檔案，找不到的路徑回 `index.html`。Logto：原封不動轉給 Logto，Logto 的轉址照原樣回給瀏覽器。
5. 每個回應加 `X-NLC-SSO: new|logto`、`Vary: Cookie`。

攔的路徑（`wrangler.jsonc` 的 `routes`）＝新登入頁的頁面路徑（`frontend/src/sso/paths.ts` 的 `SSO_PATHS`）＋上面的靜態檔。改 `SSO_PATHS` 時要一起改。Logto 原頁的其他頁面（例如兩步驟驗證、`/single-sign-on`）不經過 Worker，預覽中的人遇到時還是 Logto 原頁。

新登入頁裡「回會員中心」的連結用 `frontend/src/sso/paths.ts` 的正式預設 `https://member.newlife.org.tw`；要換網址時在 `.github/workflows/deploy-sso.yml` 的 build 步驟加環境變數 `VITE_SSO_MEMBER_CENTER_URL`。

## 本機測試（不用登入 Cloudflare）

```sh
cd frontend && npm ci && npm run build:sso
cd ../cloudflare/sso-login && npm ci
npx wrangler dev --local --upstream-protocol https            # MODE=preview
npx wrangler dev --local --upstream-protocol https --var MODE:all
```

開 `http://localhost:8787/sign-in`：沒預覽時會轉給真的 `sso.newlife.org.tw`（沒有登入流程時 Logto 會 302 到會員中心，`X-NLC-SSO: logto`）；加 `?nlc_preview=1` 拿到新頁。本機只能看 Worker 的判斷，走不完登入流程（要測登入流程用 `frontend/` 的 `npm run dev:sso`，見 `frontend/src/sso/README.md`）。

不要在本機執行 `wrangler deploy`、`wrangler login`，部署一律經 GitHub Actions。
