# NLC SSO（sso.newlife.org.tw）用的 Logto 映像：Logto 官方映像＋把內建登入頁換成 frontend 的新登入頁（dist-sso）。
# build context 是 repo 根目錄：docker build -f logto/Dockerfile .（說明見 logto/README.md）

# 升級 Logto 時，這個版本號要和 Railway 的 Pre-deploy Command（npx @logto/cli db alteration deploy <版本>）一起改，
# 兩邊不一致時資料庫結構會和程式對不上。
ARG LOGTO_VERSION=1.42.0

# ---- 第一段：build 新登入頁（Node 版本對齊 .github/workflows/ci.yml） ----
FROM node:24-slim AS sso-build
WORKDIR /app/frontend

# 先只複製 package*.json 安裝套件，程式改動時這層可以沿用快取
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
# 會員中心網址（條款連結、登入逾時回去的地方）；沒設就用 src/sso/paths.ts 的預設值。
# Railway 只會把 Dockerfile 有宣告 ARG 的服務變數帶進 build。
ARG VITE_SSO_MEMBER_CENTER_URL
RUN npm run build:sso

# ---- 第二段：Logto 官方映像，換掉內建登入頁 ----
FROM ghcr.io/logto-io/logto:${LOGTO_VERSION}

# Logto 正式環境從 packages/core 的 node_modules/@logto/experience/dist 提供登入頁，
# 那是 pnpm 的 symlink，實際檔案在 packages/experience/dist（1.42.0 實測）。
# 升級後路徑若變了就讓 build 失敗，不要默默上線舊的登入頁。
ARG EXPERIENCE_DIST=/etc/logto/packages/experience/dist
RUN test -L /etc/logto/packages/core/node_modules/@logto/experience \
  && test "$(readlink -f /etc/logto/packages/core/node_modules/@logto/experience)/dist" = "$EXPERIENCE_DIST" \
  && test -f "$EXPERIENCE_DIST/index.html" \
  || { echo "找不到 Logto 內建登入頁 $EXPERIENCE_DIST，Logto 改了目錄結構，請更新 logto/Dockerfile" >&2; exit 1; }

# 整個資料夾清掉再放新的：原本有 index.html.br／.gz 預先壓縮檔，留著的話瀏覽器會拿到舊登入頁
RUN rm -rf "$EXPERIENCE_DIST" && mkdir -p "$EXPERIENCE_DIST"
COPY --from=sso-build /app/frontend/dist-sso/ $EXPERIENCE_DIST/

# ENTRYPOINT／CMD 沿用官方映像（npm run start）
