# Backend

後端程式待匯入，目前只保留資料夾。

## 與前端的串接約定

- 前端開發伺服器會把 `/api/*` 代理到 `VITE_API_PROXY_TARGET`（預設 `http://localhost:3000`），可在 `frontend/.env.local` 修改。
- 前端統一透過 `frontend/src/api/client.ts` 呼叫 API。
