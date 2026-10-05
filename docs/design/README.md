# 設計稿索引

Figma：[MMS NewLife](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife)（僅檢視權限）

本資料夾是 Figma 的本機快照：每個畫面都匯出成 2x PNG，並整理成規格文件。**實作時先讀這裡**，只有需要確認細節時才回 Figma。

- `web/` = 桌機版（設計寬 1440），`mob/` = 手機版（設計寬 390）
- 資料夾根目錄的零散 PNG 是**設計師註記**，檔名就是註記內容
- 快照日期：2026-10-05；設計稿更新後需重新匯出

## 基礎

| 文件 | 內容 | Figma |
| --- | --- | --- |
| [tokens.md](tokens.md) | 色彩、字級、陰影、版面尺寸 | [Design system](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife?node-id=67-5435) |
| [layout/](layout/README.md) | 版型：未登入／登入後、側邊選單、麵包屑、手機選單 | [版型說明](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife?node-id=224-926) |
| [components/](components/README.md) | 共用元件：Button、Input、Checkbox、Radio、Switch、Popup… | [Compoment](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife?node-id=67-5155) |

## 功能

| 功能 | 文件 | 權限 | Figma |
| --- | --- | --- | --- |
| 登入 | [login/](login/README.md) | 未登入 | [登入頁面](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife?node-id=218-767) |
| 註冊（含 Line、未成年監護人） | [register/](register/README.md) | 未登入 | 登入頁面（第一個區塊） |
| 忘記密碼 | [forgot-password/](forgot-password/README.md) | 未登入 | [忘記密碼](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife?node-id=218-4626) |
| 會員首頁（含自動登出） | [member-home/](member-home/README.md) | 會員 | [會員頁面](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife?node-id=218-5869) |
| 個人資訊修改 | [profile/](profile/README.md) | 會員 | [個人資訊修改](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife?node-id=218-9007) |
| 修改密碼 | [change-password/](change-password/README.md) | 會員 | [修改密碼](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife?node-id=218-10961) |
| 奉獻收據下載 | [receipt/](receipt/README.md) | 會員 | 奉獻收據下載 |
| 會員審核 | [member-review/](member-review/README.md) | **區長以上** | [會員審核](https://www.figma.com/design/EIkYP6dzPYfPlhcIHROcvQ/MMS-NewLife?node-id=218-12229) |

## 全域規則（設計師註記）

- 手機版需要有選單展開功能。
- 區長以上才有「會員審核」，一般會員只有「奉獻收據下載」。
- 超過 7 分鐘沒有任何操作自動登出。
