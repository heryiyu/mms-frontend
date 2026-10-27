# 會員中心部署到 GCP（Cloud Run）

會員中心（`frontend/`）部署在 GCP 專案 `nlc-member-dev`（專案編號 206009837145）的 Cloud Run 服務 `mms-frontend`（asia-east1）。
2026-10-27 起取代 Vercel（nlc-mms.vercel.app）。SSO 登入頁（`dist-sso`）不在這裡，跟著 `logto/Dockerfile` 部署。

- 網址：https://mms-frontend-206009837145.asia-east1.run.app
- 映像：`frontend/Dockerfile`（build context 是 repo 根目錄），nginx 設定在 `frontend/nginx.conf`
- 自動部署：`.github/workflows/deploy.yml`，main 推送時 build、推到 Artifact Registry、部署新版本
- 同專案的 `mms-demo-*`、`sso-mms-demo` 是 mms-core 的服務，不要動

## GCP 資源

| 資源 | 名稱 | 用途 |
|---|---|---|
| Artifact Registry | `asia-east1-docker.pkg.dev/nlc-member-dev/mms-frontend` | 存映像 |
| Service account | `mms-frontend-runtime` | Cloud Run 執行身分，不給任何權限 |
| Service account | `mms-frontend-deployer` | GitHub Actions 部署用 |
| Workload Identity pool | `github-mms-frontend`（provider `github`） | 只接受 `heryiyu/mms-frontend` 的 main 分支 |

部署帳號的權限只限這個服務：`mms-frontend` 服務的 `run.developer`、映像庫的 `artifactregistry.writer`、`mms-frontend-runtime` 的 `iam.serviceAccountUser`。

## 一次性設定

需要專案 Owner。映像庫、`mms-frontend-runtime` 與第一次部署已完成（2026-10-27），以下是公開存取與 GitHub 部署的設定（PowerShell）：

```powershell
$P = "nlc-member-dev"; $N = "206009837145"; $REPO = "heryiyu/mms-frontend"
$RUNTIME = "mms-frontend-runtime@$P.iam.gserviceaccount.com"
$DEPLOYER = "mms-frontend-deployer@$P.iam.gserviceaccount.com"

# 1. 網站公開（任何人不用登入 Google 就能開）
gcloud run services add-iam-policy-binding mms-frontend --region=asia-east1 --project=$P --member=allUsers --role=roles/run.invoker -q

# 2. GitHub Actions 用的部署帳號與 Workload Identity Federation
gcloud services enable sts.googleapis.com --project=$P
gcloud iam service-accounts create mms-frontend-deployer --display-name="mms-frontend GitHub Actions deployer" --project=$P -q
gcloud iam workload-identity-pools create github-mms-frontend --location=global --display-name="GitHub mms-frontend" --project=$P -q
gcloud iam workload-identity-pools providers create-oidc github --location=global --workload-identity-pool=github-mms-frontend --display-name="GitHub Actions" --issuer-uri="https://token.actions.githubusercontent.com" --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" --attribute-condition="assertion.repository=='$REPO' && assertion.ref=='refs/heads/main'" --project=$P -q

# 3. 部署帳號的權限（只限這個服務、映像庫、執行身分）
gcloud run services add-iam-policy-binding mms-frontend --region=asia-east1 --project=$P --member="serviceAccount:$DEPLOYER" --role=roles/run.developer -q
gcloud artifacts repositories add-iam-policy-binding mms-frontend --location=asia-east1 --project=$P --member="serviceAccount:$DEPLOYER" --role=roles/artifactregistry.writer -q
gcloud iam service-accounts add-iam-policy-binding $RUNTIME --project=$P --member="serviceAccount:$DEPLOYER" --role=roles/iam.serviceAccountUser -q
gcloud iam service-accounts add-iam-policy-binding $DEPLOYER --project=$P --member="principalSet://iam.googleapis.com/projects/$N/locations/global/workloadIdentityPools/github-mms-frontend/attribute.repository/$REPO" --role=roles/iam.workloadIdentityUser -q
```

GitHub repo variables（Settings → Secrets and variables → Actions → Variables）：

| 名稱 | 值 |
|---|---|
| `GCP_WIF_PROVIDER` | `projects/206009837145/locations/global/workloadIdentityPools/github-mms-frontend/providers/github` |
| `GCP_DEPLOY_SA` | `mms-frontend-deployer@nlc-member-dev.iam.gserviceaccount.com` |
| `VITE_USE_MOCK` | `true`（線上展示模式，後端上線後刪掉） |
| `VITE_LOGTO_ENDPOINT`、`VITE_LOGTO_APP_ID`、`VITE_LOGTO_RESOURCE`、`VITE_LOGTO_SCOPES` | 同 `frontend/.env.local` |

Logto 的 SPA app（`b5kogsym8n3892qxesg6f`）要登記 `https://mms-frontend-206009837145.asia-east1.run.app/callback` 與 `/login`（結尾不能有斜線）。

## 手動部署

```sh
docker build -f frontend/Dockerfile -t asia-east1-docker.pkg.dev/nlc-member-dev/mms-frontend/web:manual-<commit> --build-arg VITE_USE_MOCK=true --build-arg VITE_LOGTO_ENDPOINT=... .
docker push asia-east1-docker.pkg.dev/nlc-member-dev/mms-frontend/web:manual-<commit>
gcloud run deploy mms-frontend --project=nlc-member-dev --region=asia-east1 --image=<上面的映像> --port=8080 --service-account=mms-frontend-runtime@nlc-member-dev.iam.gserviceaccount.com --max-instances=2 --memory=256Mi
```
