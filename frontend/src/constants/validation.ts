// 欄位格式規則（前端表單驗證與 MSW mock 共用的唯一來源）
// TODO(#12)：格式規則設計未定（docs/design/questions.md），後端定案後只需改這個檔案。

/** 台灣手機：09 開頭共 10 碼。TODO(#12)：是否接受國際號碼待確認 */
export const PHONE_PATTERN = /^09\d{8}$/

/** 身分證（1、2 開頭）與新式居留證（8、9 開頭）。TODO(#12)：是否需檢查碼、是否接受舊式居留證待確認 */
export const ID_NUMBER_PATTERN = /^[A-Z][1289]\d{8}$/i
