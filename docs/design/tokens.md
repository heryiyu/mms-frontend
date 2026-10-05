# Design Tokens

來源：Figma「MMS NewLife」→ `⭕Design system` 頁（[node 67-5435](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife?node-id=67-5435)），以及畫面選取時 Properties 面板顯示的 color variables。
原圖：[design-system/](design-system/)

## 色彩

| Token | Figma 名稱 | Hex | 用途 |
| --- | --- | --- | --- |
| `colorPrimary` | Maincolor/1 | `#5A4FDE` | 主色：Logo 底色、連結、選中狀態 |
| `colorPrimaryLight` | Maincolor/2 | `#AAABFF` | 主色淺色 |
| `colorPrimaryBg` | Maincolor/3 | `#AAABFF` 透明度 20% | 選單 hover / selected 底色 |
| `colorSecondary1` | Sec/1 | `#F6CB0E` | 輔助色（黃） |
| `colorSecondary2` | Sec/2 | `#EF8D2E` | 輔助色（橘） |
| `colorError` | Red | `#D61C33` | 錯誤、警示 |
| `colorSuccess` | Green | `#63D056` | 成功 |
| `gray1` | gray/1 | `#1C1C1E` | 主要文字 |
| `gray2` | gray/2 | `#6C6C70` | 次要文字 |
| `gray3` | gray/3 | `#AEAEB2` | placeholder、停用文字 |
| `gray4` | gray/4 | `#D4D4D9` | 停用按鈕底色、框線 |
| `gray5` | — | `#E5E5EA` | 分隔線 |
| `bgLayout` | BG | `#F7F8FA` | 頁面背景 |
| `gray6` | — | `#F4F4F4` | 區塊底色 |
| `white` | white | `#FFFFFF` | 卡片、輸入框底色 |

> ⚠️ 待確認：
> - 色票表 SecondColor 兩列的「Number」欄寫 `#5A4FDE`，應為設計稿誤植，以色塊上的 `#F6CB0E` / `#EF8D2E` 為準。
> - `#D4D4D9`（gray/4）出現在畫面 variables，但色票表 Gray 區列的是 `#E5E5EA`，兩者都保留。

## 字級

字體：Roboto（設計稿寫「Roboro」為誤植）；中文 fallback 用 Noto Sans TC / PingFang TC / Microsoft JhengHei。

| Token | Size | Line height | Letter spacing |
| --- | --- | --- | --- |
| Headline1 | 48px | 1.2 | 0.2px |
| Headline2 | 42px | 1.2 | 0.2px |
| Headline3 | 36px | 1.2 | 0.2px |
| Headline4 | 24px | 1.2 | 0.2px |
| Headline5 | 20px | 1.2 | 0.2px |
| BodyL | 18px | 1.5 | 0.5px |
| Body1 | 16px | 1.5 | 0.5px |
| Body2 | 14px | 1.5 | 0.5px |
| Caption | 12px | 1.5 | 0.5px |

> ⚠️ 待確認：letter spacing 單位設計稿未標示，暫定 px。

## 陰影

| Token | 值 |
| --- | --- |
| shadow1 | `0 4px 12px rgba(0, 0, 0, 0.08)` |
| shadow2 | `0 2px 8px rgba(0, 0, 0, 0.15)` |

## 版面

| 項目 | 值 | 來源 |
| --- | --- | --- |
| 桌機設計寬度 | 1440 × 1024 | web 框架 |
| 手機設計寬度 | 390 × 844 | mob 框架 |
| 頁面 padding（桌機） | 40px | web/未登入前切版 |
| 側邊選單寬度 | 固定 220px，高度跟裝置 | 版型說明標註 |
| 登入卡片寬度 | 固定 420px | 版型說明標註 |
| 輸入框 | 高約 40px、圓角約 8px、框線 gray4；error 時框線不變、只有提示文字變紅 | 元件頁量測（目測） |
| 側邊選單項目 | 196 × 32px；hover 底 colorPrimaryBg，selected 再加 1px colorPrimary 框，文字不變色 | 版型說明（目測） |
| 手機 top bar | 高 48px，左 Logo（回首頁）右漢堡選單，無麵包屑 | 版型說明 |
| 彈窗 | 桌機寬 480px、手機寬 90%，置中，高度依內容 | 元件頁 pop-up說明 |
| 主要按鈕 | 膠囊形（全圓角），**黑底 gray1 `#1C1C1E` 白字**；停用為 gray4 底 | 各畫面截圖 |
| 次要按鈕 | 膠囊形，白底黑框 | 各畫面截圖 |

> 主色 `#5A4FDE` 用在 Logo、連結文字、選單選中態、徽章以外的強調；**主要按鈕是黑色不是主色**（Ant Design 的 `colorPrimary` 仍設主色，Button 另外客製）。
