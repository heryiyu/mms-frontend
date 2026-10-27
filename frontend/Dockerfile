# 會員中心（frontend）部署到 GCP Cloud Run 用的映像：build 靜態檔後用 nginx 提供。
# build context 是 repo 根目錄：docker build -f frontend/Dockerfile .（.dockerignore 只放行 frontend/）
# 部署流程見 .github/workflows/deploy.yml。

# ---- 第一段：build 會員中心（Node 版本對齊 .github/workflows/ci.yml） ----
FROM node:24-slim AS build
WORKDIR /app/frontend

# 先只複製 package*.json 安裝套件，程式改動時這層可以沿用快取
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
# Vite 在 build 時把 VITE_* 寫進程式，所以要用 build arg 傳入（意義見 frontend/.env.example）。
# 都不是機密：會出現在瀏覽器下載的 JS 裡。
ARG VITE_API_BASE_URL
ARG VITE_USE_MOCK
ARG VITE_IDLE_LOGOUT_MINUTES
ARG VITE_LOGTO_ENDPOINT
ARG VITE_LOGTO_APP_ID
ARG VITE_LOGTO_RESOURCE
ARG VITE_LOGTO_SCOPES
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_USE_MOCK=$VITE_USE_MOCK \
    VITE_IDLE_LOGOUT_MINUTES=$VITE_IDLE_LOGOUT_MINUTES \
    VITE_LOGTO_ENDPOINT=$VITE_LOGTO_ENDPOINT \
    VITE_LOGTO_APP_ID=$VITE_LOGTO_APP_ID \
    VITE_LOGTO_RESOURCE=$VITE_LOGTO_RESOURCE \
    VITE_LOGTO_SCOPES=$VITE_LOGTO_SCOPES
# 只 build 會員中心；SSO 登入頁（dist-sso）跟著 logto/Dockerfile 走
RUN npx tsc -b && npx vite build

# ---- 第二段：nginx（非 root 版本，預設聽 8080，對應 Cloud Run 的 PORT） ----
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist/ /usr/share/nginx/html/
