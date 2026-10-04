# NLC 會員中心（NLC_mms）

```
NLC_mms/
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
