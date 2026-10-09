# NLC 會員中心（mms-frontend）

```
mms-frontend/
├── frontend/   # React + Vite + TypeScript，Ant Design，Bootstrap Icons，PWA + RWD
└── backend/    # 待匯入
```

## 前端

技術棧：

- [React](https://react.dev/) + [Vite](https://vite.dev/) + TypeScript
- UI 元件：[Ant Design](https://ant.design/components/overview)（設計參考另含 [Material 3](https://m3.material.io/components)）
- 圖示：[Bootstrap Icons](https://icons.getbootstrap.com/)，用 `<Icon name="person" />`（`src/components/Icon.tsx`）
- 路由：React Router
- PWA：[vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

### 開發

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 開發伺服器（http://localhost:5173） |
| `npm run build` | 型別檢查 + 正式建置（含 Service Worker） |
| `npm run preview` | 預覽正式建置（可測試 PWA 安裝與離線） |
| `npm run lint` | oxlint |
| `npm run generate-pwa-assets` | 由 `public/logo.svg` 重新產生 PWA 圖示 |

### 本機測試（給共同測試者）

後端尚未完成，測試一律在本機用 [MSW](https://mswjs.io) 假資料進行。Vercel 線上版（https://nlc-mms.vercel.app/ ）沒有假資料也沒有後端，只能看畫面，登入、註冊等功能無法使用。

1. 安裝 [Node.js](https://nodejs.org/) LTS 版（20 以上）與 [Git](https://git-scm.com/)。
2. 下載專案並啟動：

   ```bash
   git clone https://github.com/NLC-Ministry/mms-frontend.git
   cd mms-frontend/frontend
   npm install
   npm run dev
   ```

3. 用瀏覽器開 http://localhost:5173 。
4. 之後要測最新版：在 `mms-frontend` 資料夾執行 `git pull`，再到 `frontend/` 執行 `npm install`、`npm run dev`。

測試方式：

- 畫面左下角的切換按鈕可直接切成「未登入／一般會員／區長以上／等待審核」，不用經過登入頁。
- 常用測試帳號：一般會員 `member@test.com` / `Member@123`、區長 `leader@test.com` / `Leader@123`；OTP 填任意 4 碼（例如 `1234`）即通過，`0000` 為錯誤、`9999` 為逾時。
- 所有測試帳號與錯誤情境的觸發方式見 [`frontend/src/mocks/README.md`](frontend/src/mocks/README.md)。

注意：

- 假資料存在各自瀏覽器的記憶體，**重新整理頁面就會還原**，不同人之間也不共用。
- 假資料只在 `npm run dev` 載入，正式建置（`npm run build`）不會包含，請勿為了線上測試改動這個設定。
- 發現問題請到 [Issues](https://github.com/NLC-Ministry/mms-frontend/issues) 回報，附上網址、操作步驟與截圖。

### 目錄

```
frontend/src/
├── api/          # API 呼叫（client.ts）
├── components/   # 共用元件（Icon、PwaUpdatePrompt）
├── layouts/      # 版型（MainLayout：桌機側欄 / 手機底部 Tab Bar）
├── pages/        # 頁面
├── routes/       # 路由表
├── styles/       # 全域樣式、CSS 變數
└── theme/        # Ant Design 主題 token（對應 Figma 設計）
```

### RWD 斷點

與 Ant Design Grid 一致，mobile-first：

| xs | sm | md | lg | xl | xxl |
| --- | --- | --- | --- | --- | --- |
| <576 | ≥576 | ≥768 | ≥992 | ≥1200 | ≥1600 |
