# NLC_mms 專案指令

- 前端在 `frontend/`，後端在 `backend/`（尚未匯入，不要自行建立後端程式）。
- 前端指令一律在 `frontend/` 下執行；改完至少跑 `npm run build` 與 `npm run lint`。
- UI 優先用 Ant Design 元件，樣式客製先改 `src/theme/index.ts` 的 token，再考慮 CSS Modules（`*.module.css`）。
- 圖示只用 Bootstrap Icons，透過 `src/components/Icon.tsx`；不要另外引入 @ant-design/icons 或其他圖示庫。
- RWD 採 mobile-first，斷點用 Ant Design 的 xs/sm/md/lg/xl/xxl（`Grid.useBreakpoint` 或 `Col` 的 RWD props）。
- 依 Figma 實作時，色彩、字級、間距、圓角先對應到 theme token 或 `src/styles/global.css` 的 CSS 變數，不要在元件內寫死數值。
- API 呼叫一律經過 `src/api/client.ts`。
