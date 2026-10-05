# 共用元件（Components）

來源：Figma 元件頁匯出圖（本資料夾 PNG）。色彩／字級名稱對照 [../tokens.md](../tokens.md)。

> PNG 皆為 @2x 匯出，尺寸已換算回 1x。標「（目測）」者為量測或目視推估。紫色虛線框是 Figma component set 的外框，不是元件的一部分。
> 圖示一律用 Bootstrap Icons（經 `src/components/Icon.tsx`），下列 `bi-*` 名稱為建議對應。

---

## Button

原圖：[Button.png](Button.png)

- 用途：一般動作按鈕（例：彈窗的「確認」、登入頁「登入」「使用Line快速登入」）。
- 共通：膠囊形（全圓角）、高 40px、寬約 164px（目測，實際依內容／容器）、文字約 Body1 16px（目測）。
- 內含文字：「Action」（placeholder）。

| 變體（左→右） | 底色 | 框線 | 文字 |
| --- | --- | --- | --- |
| Outline（次要） | 透明 | 1px `gray1` | `gray1` |
| Solid（主要） | `gray1`（#1C1C1E） | 無 | `white` |
| Disabled | `gray4`（#D4D4D9） | 1px `gray3`（#AEAEB2） | `gray2`（#6C6C70） |
| Solid hover / pressed（推測） | `gray1` 80% 不透明度 | 1px `gray1` | `white` |

- 注意：元件頁的主要按鈕是**黑色**（`gray1`），不是 tokens.md 寫的 `colorPrimary`；第 4 個變體未標示名稱，依外觀推測為 hover／pressed。

對應 Ant Design：`Button shape="round"`；主要用 `color="default" variant="solid"`、次要用 `variant="outlined"`（框線／文字改 `gray1`）；token `controlHeight: 40`，停用色 `colorBgContainerDisabled=gray4`、`borderColorDisabled=gray3`、`colorTextDisabled=gray2`；hover 以 CSS 設 `opacity: .8` 或 `defaultHoverBg` 類 token。

---

## TextButton

原圖：[TextButton.png](TextButton.png)

- 用途：小型新增／附加動作（內容為「＋」圖示＋文字）。
- 尺寸：約 65 × 32px、圓角約 8px（目測）；文字約 Body1 16px（目測）。
- 內含文字：「+ XX」（XX 為 placeholder）。

| 狀態 | 底色 | 框線 | 文字／圖示 |
| --- | --- | --- | --- |
| default | `colorPrimaryBg`（#AAABFF 20%） | 1px `colorPrimary` | `colorPrimary` |
| disabled | `gray5`（#E5E5EA） | 1px `gray3` | `gray2` |

對應 Ant Design：`Button icon={<Icon name="plus" />}`（`bi-plus`）、`color="primary" variant="outlined"` 並把底色改 `colorPrimaryBg`、圓角 8px；停用時底色 `gray5`、框 `gray3`、字 `gray2`（需 CSS Module 或 component token 覆寫）。

---

## Input

原圖：[Input.png](Input.png)

- 用途：單行文字輸入。
- 尺寸：寬 400px（元件頁示意，實際隨容器）、高 40px、圓角約 8px（目測；tokens.md 暫記 4px，兩者需確認）、左內距約 12px（目測）、文字約 Body1 16px（目測）。
- 框線：1px `gray3`（#AEAEB2）。底色透明／`white`。

| 狀態（上→下） | 框線 | 文字 | 其他 |
| --- | --- | --- | --- |
| default（空值） | `gray3` | placeholder「holder」`gray3` | — |
| error | `gray3`（框線**不變紅**） | 輸入值「XX」`colorError` | 下方錯誤訊息「請輸入XXX」`colorError`，約 Body1（目測） |
| focus | 1px `colorPrimary` | 「XXXXXXX」`gray1`＋游標 | — |
| filled | `gray3` | 「XXXXXXX」`gray1` | — |

對應 Ant Design：`Input`（`Form.Item` 負責錯誤訊息）；token `controlHeight: 40`、`colorBorder: gray3`、`activeBorderColor`/`hoverBorderColor: colorPrimary`、`colorTextPlaceholder: gray3`、`borderRadius: 8`（待確認）；**AntD 的 `status="error"` 會把框線變紅，設計稿是框線維持灰、文字變紅**，需客製 `.ant-input-status-error` 的 border 與文字色。

---

## title Input

原圖：[title-Input.png](title-Input.png)

- 用途：左側標籤＋右側輸入框的表單列（橫向表單）。
- 標籤：「Title」`gray2`，後接必填星號「*」`colorError`（星號在**後**）。
- 輸入框規格與狀態同 [Input](#input)：default「holder」、error「XX」＋「請輸入XXX」、focus「XXXXXXX」、filled「XXXXXXX」。
- 標籤欄寬約 100px（目測）；輸入框寬約 300px（目測）；第一列標籤／輸入框位置與下三列略有偏移（約 6px），應為設計稿對齊誤差。

對應 Ant Design：`Form layout="horizontal"` ＋ `Form.Item label required`；用 `requiredMark={(label, { required }) => …}` 把星號放到標籤後並設 `colorError`；`labelCol` 寬約 100px（目測）、標籤色 `gray2`、取消冒號（`colon={false}`）。

---

## eye

原圖：[eye.png](eye.png)

- 用途：密碼欄位的顯示／隱藏切換（登入頁兩個輸入框右側皆有）。
- 變體：左＝顯示（睜眼），右＝隱藏（眼睛加斜線）。
- 尺寸：約 16 × 11px（目測），顏色 `gray2`（#6C6C70）。

對應 Ant Design：`Input.Password` 的 `iconRender={(visible) => <Icon name={visible ? 'eye-fill' : 'eye-slash-fill'} />}`（`bi-eye-fill` / `bi-eye-slash-fill`），圖示色 `gray2`。

---

## checkbox / checkbox-1

原圖：[checkbox.png](checkbox.png)、[checkbox-1.png](checkbox-1.png)

- 用途：勾選（例：登入頁「記住帳號」）。
- 尺寸：16 × 16px、圓角約 2–4px（目測）。

| 狀態 | 樣式 |
| --- | --- |
| unchecked | 白／透明底、1px `gray3` 框 |
| checked | `colorPrimary` 底、白色勾 |

- `checkbox-1.png` 與 checkbox 的 checked 狀態相同（單獨匯出的 checked 實例）。
- 內含文字：無（標籤文字由使用處提供，例「記住帳號」）。

對應 Ant Design：`Checkbox`；token `colorPrimary`、`colorBorder: gray3`、`controlInteractiveSize: 16`、`borderRadiusSM` 約 2–4（目測）。

---

## Radio

原圖：[Radio.png](Radio.png)

- 用途：單選。
- 尺寸：16 × 16px 圓形。

| 狀態 | 樣式 |
| --- | --- |
| checked | 1px `colorPrimary` 外圈＋內部 `colorPrimary` 實心圓點 |
| unchecked | 1px `gray3` 外圈、內部透明 |

- 內含文字：無。

對應 Ant Design：`Radio`；token `colorPrimary`、`colorBorder: gray3`、`radioSize: 16`；AntD 預設 checked 是「實心底＋白點」，設計稿是「外圈＋紫點、底透明」，需調 `dotSize` 並把 checked 背景改白／透明（CSS 或 component token `buttonCheckedBg` 類設定）。

---

## Switch BTN

原圖：[Switch-BTN.png](Switch-BTN.png)

- 用途：開關。
- 尺寸：約 42 × 24px、把手約 20px（目測）。

| 狀態 | 軌道 | 把手 |
| --- | --- | --- |
| on | `colorPrimary` 實心 | 右側、白色圓，內含 `colorPrimary` 打勾圖示 |
| off | 白底＋1px `gray3` 框 | 左側、`gray3` 圓，內含白色「—」圖示 |

- 內含文字：無。

對應 Ant Design：`Switch`；token `trackHeight: 24`、`trackMinWidth: 42`、`handleSize: 20`、`colorPrimary`；把手內圖示（`bi-check` / `bi-dash`）與 off 狀態白底灰框、灰把手需 CSS Module 客製（AntD 預設 off 為灰底白把手）。

---

## Loc

原圖：[Loc.png](Loc.png)

- 用途：篩選標籤／分類 chip（文字「全部」，推測用於列表篩選）。
- 尺寸：約 65 × 40px、膠囊形（目測）；文字約 BodyL 18px（目測）。
- 內含文字：「全部」。

| 狀態 | 底色 | 框線 | 文字 |
| --- | --- | --- | --- |
| default | `white` | 1px `gray3` | `gray2` |
| selected | `colorPrimaryBg` | 1px `colorPrimary` | `colorPrimary` |

對應 Ant Design：`Tag.CheckableTag`（或 `Radio.Group optionType="button"` 搭配圓角）；客製為膠囊形、高 40px、default 白底灰框、checked 改 `colorPrimaryBg` 底＋紫框紫字（AntD 預設 checked 是實心主色）。

---

## Menu

原圖：[Menu.png](Menu.png)

- 用途：手機 top bar 右側的功能選單按鈕。
- 變體：左＝漢堡「≡」（收合），右＝「✕」（展開後關閉）。
- 尺寸：圖示約 24 × 24px（目測），顏色 `gray1`。
- 內含文字：無。

對應 Ant Design：`Button type="text"`，`icon` 依選單開關切換 `bi-list` / `bi-x-lg`，搭配 `Drawer` 控制展開。

---

## Calendar-Card

原圖：[Calendar-Card.png](Calendar-Card.png)

- 用途：日期選擇面板（月曆）。
- 尺寸：約 300 × 274px、白底、圓角約 8px、淡陰影（目測近 `shadow1`）。
- 頂部（高約 55px，下方 1px 分隔線，取樣 #F0F0F0，近 `gray6`，目測），靠右排列：
  - 年份下拉「2020 ⌄」（`gray3` 框、圓角小）
  - 月份下拉「12 ⌄」
  - 切換「月 | 年」：選中「月」為 `colorPrimary` 框＋紫字，「年」為 `gray3` 框＋`gray1` 字
- 星期列：「Su」「Mo」「Tu」「We」「Th」「Fr」「Sa」（`gray1`）。
- 日期格：當月日期 `gray1`；前後月日期（29、30／1–9）淡灰（`gray4` 附近，目測）。
- 選中日期「17」：1px `colorPrimary` 方框、圓角約 2px（目測），文字 `gray1`。
- 字級：約 Body1 16px（目測）。

對應 Ant Design：`Calendar fullscreen={false}`（或 `DatePicker` 的 panel），以 `headerRender` 自訂為 `Select`（年）＋`Select`（月）＋`Radio.Group optionType="button"`（月／年）；選中日改成「紫色框線、不填色」需覆寫 `.ant-picker-cell-selected` 樣式（AntD 預設為實心主色）。

---

## pop-up說明（彈窗）

原圖：[pop-up說明.png](pop-up說明.png)

- 用途：訊息提示／確認彈窗。圖中只有**一種彈窗類型**（標題＋內容＋單一確認按鈕＋右上關閉），分 web 與 mob 兩種寬度示意。
- 遮罩：整頁覆蓋半透明黑（約 `rgba(0,0,0,0.25)`，目測）。

### 彈窗內容（文字照稿）

| 位置 | 文字 | 樣式 |
| --- | --- | --- |
| 標題（置中） | 「標題」 | 粗體 `gray1`，約 Headline5 20px（目測） |
| 右上 | 「✕」關閉圖示 | `gray3`（目測） |
| 內文（置中，兩行） | web：「內容內容內容內容內容內容內容內容內容內容內容」／「內容內容內容內容內容內容」；mob：「內容內容內容內容內容內容內容」／「內容內容內容內容」（皆為 placeholder，mob 字數依圖目測） | `gray2`，約 Body1 16px（目測） |
| 按鈕（置中） | 「確認」 | Button Solid：`gray1` 底白字、膠囊形、約 160 × 40px |

- 卡片：白底、圓角約 12px（目測）。

### 設計師註記（原文）

| 註記 | 含意 |
| --- | --- |
| web Pop寬度 480 px 固定在中間 / 高度跟著內容走 | 桌機彈窗寬 480px、垂直水平置中、高度自適應 |
| mob Pop寬度 跟著手機寬度90% 固定在中間 / 高度跟著內容走 | 手機彈窗寬 90vw、置中、高度自適應 |

- 背景示意：web 為登入頁（帳號欄「XXXXXX@mail.com」、密碼欄「****************」、「記住帳號」已勾選）；mob 同為登入頁。這是示意情境，非彈窗本身內容。

對應 Ant Design：`Modal centered closable width={screens.md ? 480 : '90%'}`；`title` 置中、內文置中 `gray2`；`footer` 改為單一置中 `Button shape="round" color="default" variant="solid"`「確認」；`closeIcon={<Icon name="x-lg" />}`；遮罩色以 token `colorBgMask` 設定（約 rgba(0,0,0,0.25)，目測）；圓角 token `borderRadiusLG` 約 12（目測）。

---

## 待確認

1. 主要按鈕應為黑色（元件頁）或 `colorPrimary`（tokens.md 描述）。
2. Button 第 4 個變體（`gray1` 80%）是否為 hover／pressed。
3. Input 圓角 8px（目測）與 tokens.md 的 4px 不一致；error 狀態框線是否真的維持灰色。
4. Loc 元件的實際使用場景（推測為列表篩選）。
5. 彈窗是否還有其他類型（雙按鈕確認／取消、成功／失敗圖示），本頁只畫了一種。
